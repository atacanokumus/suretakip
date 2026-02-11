const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * AI Helper for DaVinci Assistant
 */
class TeamsAIHelper {
    constructor(apiKey) {
        if (!apiKey) throw new Error("GEMINI_API_KEY is required");
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    }

    /**
     * Extracts task details from a message string
     * @param {string} message The raw chat message
     * @param {Array} projects List of {id, name}
     * @param {Array} users List of {email, displayName}
     * @returns {Promise<Object|null>}
     */
    async extractTask(message, projects, users) {
        const referenceDate = new Date().toISOString().split('T')[0];

        const prompt = `
        You are 'DaVinci Assistant', an AI task extractor for a renewable energy platform.
        Current Date (Reference): ${referenceDate}

        TASKS: Convert the user's message into a structured JSON job object.
        
        AVAILABLE PROJECTS:
        ${projects.map(p => `- ${p.name}`).join('\n')}

        AVAILABLE USERS (Assignees):
        ${users.map(u => `- ${u.displayName} (${u.email})`).join('\n')}

        RULES:
        1. 'projectName': Must match exactly one of the AVAILABLE PROJECTS. Use semantic similarity (e.g., 'Çandarlı' -> 'ÇANDARLI GES'). If no match, use 'Genel'.
        2. 'assignee': Must be the email of an AVAILABLE USER. If names like 'Atacan bey' or 'Gamze hanım' are used, map them correctly.
        3. 'dueDate': Extract the intended date. 'Haftaya' means current_date + 7 days. 'Yarın' means current_date + 1. Return in 'YYYY-MM-DD' format.
        4. 'title': A short, clear summary of the task.
        5. 'description': Detailed instruction from the message.

        OUTPUT FORMAT (Strict JSON):
        {
          "title": "...",
          "projectName": "...",
          "assignee": "...",
          "dueDate": "YYYY-MM-DD",
          "description": "...",
          "priority": "normal",
          "status": "pending"
        }

        USER MESSAGE: "${message}"
        `;

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Clean markdown JSON block if present
            const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
            return JSON.parse(jsonStr);
        } catch (error) {
            console.error("AI Extraction Error:", error);
            return null;
        }
    }
}

module.exports = TeamsAIHelper;
