import Foundation
import FirebaseFirestore
import FirebaseAuth
import FirebaseCore
import Combine

/// Handles all Firestore operations — mirrors web app's data.js
/// Uses the SAME Firestore document path: daVinciData/master
/// This ensures full synchronization between web and iOS
@MainActor
class FirestoreService: ObservableObject {
    @Published var obligations: [Obligation] = []
    @Published var jobs: [Job] = []
    @Published var projects: [Project] = []
    @Published var users: [AppUser] = []
    @Published var isLoading = false
    @Published var lastUpdate: Date?
    
    private lazy var db: Firestore = {
        if FirebaseApp.app() == nil {
            FirebaseApp.configure()
        }
        return Firestore.firestore()
    }()
    
    private var listener: ListenerRegistration?
    
    // MARK: - Same Firestore path as web app
    private let masterDocPath = "daVinciData/master"
    private let usersCollection = "users"
    
    deinit {
        listener?.remove()
    }
    
    // MARK: - Load Data (Initial Fetch)
    
    func loadData() async {
        isLoading = true
        defer { isLoading = false }
        
        do {
            let docRef = db.document(masterDocPath)
            let snapshot = try await docRef.getDocument()
            
            if let data = snapshot.data() {
                parseAndStoreData(data)
            }
            
            // Fetch users from separate collection (same as web app)
            await fetchUsers()
            
            // Start real-time listener (same as web app's initFirestoreSync)
            startRealtimeSync()
            
        } catch {
            print("❌ Firestore load error: \(error)")
        }
    }
    
    // MARK: - Real-time Sync (mirrors initFirestoreSync)
    
    func startRealtimeSync() {
        listener?.remove()
        
        let docRef = db.document(masterDocPath)
        listener = docRef.addSnapshotListener { [weak self] snapshot, error in
            guard let self = self, let data = snapshot?.data() else { return }
            
            Task { @MainActor in
                self.parseAndStoreData(data)
            }
        }
    }
    
    // MARK: - Parse Firestore Data
    
    private func parseAndStoreData(_ data: [String: Any]) {
        // 1. Parse Obligations
        if let obligationsArray = data["obligations"] as? [[String: Any]] {
            obligations = obligationsArray.compactMap { dict in
                parseObligation(dict)
            }
        }
        
        // 2. Parse Jobs
        if let jobsArray = data["jobs"] as? [[String: Any]] {
            jobs = jobsArray.compactMap { dict in
                parseJob(dict)
            }
        }
        
        // 3. Parse Projects
        if let projectsArray = data["projects"] as? [[String: Any]] {
            projects = projectsArray.compactMap { dict in
                parseProject(dict)
            }
        }
        
        // Update timestamp
        if let updateStr = data["lastUpdate"] as? String {
            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            lastUpdate = formatter.date(from: updateStr)
        }
    }
    
    // MARK: - Fetch Users (from 'users' collection)
    
    func fetchUsers() async {
        do {
            let snapshot = try await db.collection(usersCollection).getDocuments()
            users = snapshot.documents.compactMap { doc in
                let data = doc.data()
                return AppUser(
                    email: data["email"] as? String ?? doc.documentID,
                    displayName: data["displayName"] as? String,
                    title: data["title"] as? String,
                    uid: data["uid"] as? String,
                    photoURL: data["photoURL"] as? String,
                    lastUpdated: data["lastUpdated"] as? String
                )
            }
        } catch {
            print("❌ Error fetching users: \(error)")
        }
    }
    
    // MARK: - Sync to Firestore (mirrors syncToFirestore)
    
    func syncToFirestore() async {
        guard let userEmail = Auth.auth().currentUser?.email else { return }
        
        do {
            let docRef = db.document(masterDocPath)
            
            // Convert back to dictionaries (matching web app format)
            let obligationsData = obligations.map { obligationToDict($0) }
            let jobsData = jobs.map { jobToDict($0) }
            let projectsData = projects.map { projectToDict($0) }
            
            try await docRef.setData([
                "obligations": obligationsData,
                "jobs": jobsData,
                "projects": projectsData,
                "lastUpdate": ISO8601DateFormatter().string(from: Date()),
                "updatedBy": userEmail
            ])
        } catch {
            print("❌ Firestore sync error: \(error)")
        }
    }
    
    // MARK: - Obligation CRUD
    
    func updateObligationStatus(id: String, newStatus: String) async {
        guard let index = obligations.firstIndex(where: { $0.id == id }) else { return }
        obligations[index].status = newStatus
        obligations[index].updatedAt = Date()
        await syncToFirestore()
    }
    
    func updateObligationDeadline(id: String, newDate: Date) async {
        guard let index = obligations.firstIndex(where: { $0.id == id }) else { return }
        obligations[index].deadline = newDate
        obligations[index].updatedAt = Date()
        await syncToFirestore()
    }
    
    func addObligationComment(id: String, text: String) async {
        guard let index = obligations.firstIndex(where: { $0.id == id }),
              let userEmail = Auth.auth().currentUser?.email else { return }
        
        let comment = Obligation.Comment(user: userEmail, text: text, timestamp: Date())
        if obligations[index].comments == nil {
            obligations[index].comments = []
        }
        obligations[index].comments?.append(comment)
        obligations[index].updatedAt = Date()
        await syncToFirestore()
    }
    
    // MARK: - Job CRUD
    
    func addJob(_ job: Job) async {
        jobs.append(job)
        await syncToFirestore()
    }
    
    func updateJob(id: String, updates: (inout Job) -> Void) async {
        guard let index = jobs.firstIndex(where: { $0.id == id }) else { return }
        updates(&jobs[index])
        jobs[index].updatedAt = Date()
        await syncToFirestore()
    }
    
    func toggleJobStatus(id: String) async {
        guard let index = jobs.firstIndex(where: { $0.id == id }) else { return }
        let userEmail = Auth.auth().currentUser?.email ?? "unknown"
        
        if jobs[index].status == "completed" {
            jobs[index].status = "active"
            jobs[index].completedAt = nil
        } else {
            jobs[index].status = "completed"
            jobs[index].completedAt = Date()
        }
        
        // Append history (matching web app behavior)
        let entry = Job.JobHistoryEntry(
            action: jobs[index].status == "completed" ? "completed" : "reopened",
            user: userEmail,
            date: Date()
        )
        if jobs[index].history == nil { jobs[index].history = [] }
        jobs[index].history?.append(entry)
        
        jobs[index].updatedAt = Date()
        await syncToFirestore()
    }
    
    func deleteJob(id: String) async {
        jobs.removeAll { $0.id == id }
        await syncToFirestore()
    }
    
    func addJobComment(id: String, text: String) async {
        guard let index = jobs.firstIndex(where: { $0.id == id }),
              let userEmail = Auth.auth().currentUser?.email else { return }
        
        let comment = Job.JobComment(user: userEmail, text: text, timestamp: Date())
        if jobs[index].comments == nil { jobs[index].comments = [] }
        jobs[index].comments?.append(comment)
        jobs[index].updatedAt = Date()
        await syncToFirestore()
    }
    
    // MARK: - User Profile
    
    func saveUserProfile(_ profile: AppUser) async {
        do {
            let userRef = db.collection(usersCollection).document(profile.email)
            try await userRef.setData([
                "email": profile.email,
                "displayName": profile.displayName ?? "",
                "title": profile.title ?? "",
                "uid": profile.uid ?? "",
                "photoURL": profile.photoURL ?? "",
                "lastUpdated": ISO8601DateFormatter().string(from: Date())
            ], merge: true)
            
            // Update local
            if let index = users.firstIndex(where: { $0.email == profile.email }) {
                users[index] = profile
            } else {
                users.append(profile)
            }
        } catch {
            print("❌ Error saving user profile: \(error)")
        }
    }
    
    // MARK: - Helper: Get user display name
    
    func getUserName(email: String?) -> String {
        guard let email = email else { return "Bilinmiyor" }
        if let user = users.first(where: { $0.email == email }) {
            return user.nameOrEmail
        }
        return email.components(separatedBy: "@").first ?? email
    }
    
    // MARK: - Parsers (Firestore Dict → Swift Model)
    
    private func parseObligation(_ dict: [String: Any]) -> Obligation? {
        guard let id = dict["id"] as? String,
              let projectName = dict["projectName"] as? String else { return nil }
        
        return Obligation(
            id: id,
            projectName: projectName,
            projectLink: dict["projectLink"] as? String,
            obligationType: dict["obligationType"] as? String ?? "",
            obligationDescription: dict["obligationDescription"] as? String ?? "",
            deadline: convertToDate(dict["deadline"]) ?? Date(),
            notes: dict["notes"] as? String,
            status: dict["status"] as? String ?? "pending",
            comments: parseComments(dict["comments"]),
            createdAt: convertToDate(dict["createdAt"]) ?? Date(),
            updatedAt: convertToDate(dict["updatedAt"]) ?? Date()
        )
    }
    
    private func parseJob(_ dict: [String: Any]) -> Job? {
        guard let id = dict["id"] as? String,
              let title = dict["title"] as? String else { return nil }
        
        return Job(
            id: id,
            title: title,
            description: dict["description"] as? String,
            status: dict["status"] as? String ?? "active",
            priority: dict["priority"] as? String,
            assignedTo: dict["assignedTo"] as? String,
            projectName: dict["projectName"] as? String,
            linkedObligationId: dict["linkedObligationId"] as? String,
            linkedObligationLabel: dict["linkedObligationLabel"] as? String,
            dueDate: convertToDate(dict["dueDate"]),
            completedAt: convertToDate(dict["completedAt"]),
            comments: parseJobComments(dict["comments"]),
            history: parseJobHistory(dict["history"]),
            emoji: dict["emoji"] as? String,
            createdAt: convertToDate(dict["createdAt"]) ?? Date(),
            updatedAt: convertToDate(dict["updatedAt"]) ?? Date()
        )
    }
    
    private func parseProject(_ dict: [String: Any]) -> Project? {
        guard let id = dict["id"] as? String,
              let name = dict["name"] as? String else { return nil }
        
        var expert: Project.ExpertInfo?
        if let expertDict = dict["expert"] as? [String: Any] {
            expert = Project.ExpertInfo(
                name: expertDict["name"] as? String,
                phone: expertDict["phone"] as? String
            )
        }
        
        return Project(
            id: id,
            name: name,
            company: dict["company"] as? String,
            parent: dict["parent"] as? String,
            expert: expert
        )
    }
    
    private func parseComments(_ value: Any?) -> [Obligation.Comment]? {
        guard let array = value as? [[String: Any]] else { return nil }
        return array.compactMap { dict in
            guard let user = dict["user"] as? String,
                  let text = dict["text"] as? String else { return nil }
            return Obligation.Comment(
                user: user,
                text: text,
                timestamp: convertToDate(dict["timestamp"]) ?? Date()
            )
        }
    }
    
    private func parseJobComments(_ value: Any?) -> [Job.JobComment]? {
        guard let array = value as? [[String: Any]] else { return nil }
        return array.compactMap { dict in
            guard let user = dict["user"] as? String,
                  let text = dict["text"] as? String else { return nil }
            return Job.JobComment(
                user: user,
                text: text,
                timestamp: convertToDate(dict["timestamp"]) ?? Date()
            )
        }
    }
    
    private func parseJobHistory(_ value: Any?) -> [Job.JobHistoryEntry]? {
        guard let array = value as? [[String: Any]] else { return nil }
        return array.compactMap { dict in
            guard let action = dict["action"] as? String,
                  let user = dict["user"] as? String else { return nil }
            return Job.JobHistoryEntry(
                action: action,
                user: user,
                date: convertToDate(dict["date"]) ?? Date()
            )
        }
    }
    
    // MARK: - Serializers (Swift Model → Firestore Dict)
    
    private func obligationToDict(_ o: Obligation) -> [String: Any] {
        var dict: [String: Any] = [
            "id": o.id,
            "projectName": o.projectName,
            "obligationType": o.obligationType,
            "obligationDescription": o.obligationDescription,
            "deadline": Timestamp(date: o.deadline),
            "status": o.status,
            "createdAt": Timestamp(date: o.createdAt),
            "updatedAt": Timestamp(date: o.updatedAt)
        ]
        if let link = o.projectLink { dict["projectLink"] = link }
        if let notes = o.notes { dict["notes"] = notes }
        if let comments = o.comments {
            dict["comments"] = comments.map { c in
                ["user": c.user, "text": c.text, "timestamp": Timestamp(date: c.timestamp)]
            }
        }
        return dict
    }
    
    private func jobToDict(_ j: Job) -> [String: Any] {
        var dict: [String: Any] = [
            "id": j.id,
            "title": j.title,
            "status": j.status,
            "createdAt": Timestamp(date: j.createdAt),
            "updatedAt": Timestamp(date: j.updatedAt)
        ]
        if let desc = j.description { dict["description"] = desc }
        if let priority = j.priority { dict["priority"] = priority }
        if let assignee = j.assignedTo { dict["assignedTo"] = assignee }
        if let project = j.projectName { dict["projectName"] = project }
        if let linkedId = j.linkedObligationId { dict["linkedObligationId"] = linkedId }
        if let linkedLabel = j.linkedObligationLabel { dict["linkedObligationLabel"] = linkedLabel }
        if let due = j.dueDate { dict["dueDate"] = Timestamp(date: due) }
        if let completed = j.completedAt { dict["completedAt"] = Timestamp(date: completed) }
        if let emoji = j.emoji { dict["emoji"] = emoji }
        if let comments = j.comments {
            dict["comments"] = comments.map { c in
                ["user": c.user, "text": c.text, "timestamp": Timestamp(date: c.timestamp)]
            }
        }
        if let history = j.history {
            dict["history"] = history.map { h in
                ["action": h.action, "user": h.user, "date": Timestamp(date: h.date)]
            }
        }
        return dict
    }
    
    private func projectToDict(_ p: Project) -> [String: Any] {
        var dict: [String: Any] = [
            "id": p.id,
            "name": p.name
        ]
        if let company = p.company { dict["company"] = company }
        if let parent = p.parent { dict["parent"] = parent }
        if let expert = p.expert {
            dict["expert"] = [
                "name": expert.name ?? "",
                "phone": expert.phone ?? ""
            ]
        }
        return dict
    }
    
    // MARK: - Date Conversion (matches web app's convertToDate)
    
    private func convertToDate(_ value: Any?) -> Date? {
        guard let value = value else { return nil }
        
        // Firestore Timestamp
        if let timestamp = value as? Timestamp {
            return timestamp.dateValue()
        }
        
        // ISO 8601 String
        if let str = value as? String {
            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            if let date = formatter.date(from: str) { return date }
            
            // Try without fractional seconds
            formatter.formatOptions = [.withInternetDateTime]
            if let date = formatter.date(from: str) { return date }
            
            // Try simple date format
            let simple = DateFormatter()
            simple.dateFormat = "yyyy-MM-dd"
            if let date = simple.date(from: str) { return date }
        }
        
        // Number (epoch milliseconds — from web)
        if let num = value as? Double {
            return Date(timeIntervalSince1970: num / 1000)
        }
        
        return nil
    }
}
