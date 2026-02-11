
/**
 * Emoji Picker Module
 * Adds emoji support to specified textareas
 */

export class EmojiPicker {
    constructor(targetId) {
        this.targetId = targetId;
        this.targetElement = document.getElementById(targetId);

        if (!this.targetElement) {
            console.warn(`EmojiPicker: Target element #${targetId} not found.`);
            return;
        }

        this.init();
    }

    init() {
        // Create wrapper if not already wrapped
        this.wrapTarget();

        // Create trigger button
        this.createTriggerInfo();

        // Create popover
        this.createPopover();

        // Bind events
        this.bindEvents();
    }

    wrapTarget() {
        // Check if already responsible
        const parent = this.targetElement.parentNode;
        if (parent.classList.contains('emoji-input-wrapper')) {
            this.wrapper = parent;
            return;
        }

        // Create wrapper
        this.wrapper = document.createElement('div');
        this.wrapper.className = 'emoji-input-wrapper';
        this.wrapper.style.position = 'relative';

        // Insert wrapper before target
        parent.insertBefore(this.wrapper, this.targetElement);

        // Move target into wrapper
        this.wrapper.appendChild(this.targetElement);
    }

    createTriggerInfo() {
        this.triggerBtn = document.createElement('button');
        this.triggerBtn.type = 'button';
        this.triggerBtn.className = 'emoji-trigger-btn';
        this.triggerBtn.innerHTML = '😀';
        this.triggerBtn.title = 'Emoji Ekle';

        this.wrapper.appendChild(this.triggerBtn);
    }

    createPopover() {
        this.popover = document.createElement('div');
        this.popover.className = 'emoji-popover';
        this.popover.style.display = 'none';

        // Categories
        const categories = {
            'Sık Kullanılanlar': ['✅', '❌', '⚠️', '🔥', '✨', '📅', '🕒', '💼', '📊', '📈', '📉', '📎', '📌', '💾', '🗑️', '🔍', '⚙️', '👤', '🏗️', '🔨'],
            'Yüzler': ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', 'worried', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', 'mw_head_explode', '😶', '😐', '😑', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖'],
            'El İşaretleri': ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪'],
            'Nesneler & Semboller': ['💡', '💣', '💤', '💥', '💦', '💨', '💫', '💬', '🗨️', '🗯️', '💭', '🕳️', '👓', '🕶️', '🥽', '🥼', '👔', '👕', '👖', '🧣', '🧤', '🧥', '🧦', '👗', '👘', '🥻', '🩱', '🩲', '🩳', '👙', '👚', '👛', '👜', '👝', '🛍️', '🎒', '👞', '👟', '🥾', '🥿', '👠', '👡', '🩰', '👢', '👑', '👒', '🎩', '🎓', '🧢', '⛑️', '📿', '💄', '💍', '💎', '📢', '📣', '🔔', '🔕', '🎼', '🎵', '🎶', '🎙️', '🎚️', '🎛️', '🎤', '🎧', '📻', '🎷', '🎸', '🎹', '🎺', '🎻', '🪕', '🥁', '📱', '📲', '☎️', '📞', 'Pager', '📠', '🔋', '🔌', '💻', '🖥️', '🖨️', '⌨️', '🖱️', '🖲️', '💽', '💾', '💿', '📀', '🧮', '🎥', '🎞️', '📽️', '🎬', '📺', '📷', '📸', '📹', '📼', '🔍', '🔎', '🕯️', '💡', '🔦', '🏮', '🪔', '📔', '📕', '📖', '📗', '📘', '📙', '📚', '📓', '📒', '📃', '📜', '📄', '📰', '🗞️', '📑', '🔖', '🏷️', '💰', 'coin', '💴', '💵', '💶', '💷', '💸', '💳', '🧾', '✉️', '📧', '📨', '📩', '📤', '📥', '📦', '📫', '📪', '📬', '📭', '📮', '🗳️', '✏️', '✒️', '🖋️', '🖊️', '🖌️', '🖍️', '📝', '📁', '📂', '🗂️', '📅', '📆', '🗒️', '🗓️', '📇', '📈', '📉', '📊', '📋', '📌', '📍', '📎', '🖇️', '📏', '📐', '✂️', '🗃️', '🗄️', '🗑️', '🔒', '🔓', '🔏', '🔐', '🔑', '🗝️', '🔨', '🪓', '⛏️', '⚒️', '🛠️', '🗡️', '⚔️', '🔫', '🪃', '🏹', '🛡️', '🔧', '🪛', '🔩', '⚙️', '🗜️', '⚖️', '🦯', '🔗', '⛓️', '🪝', '🧰', '🧲', '🪜', '⚗️', '🧪', '🧫', '🧬', '🔬', '🔭', '📡', '💉', '🩸', '💊', '🩹', '🩺', '🚪', '🛗', '🪞', '🪟', '🛏️', '🛋️', '🪑', '🚽', '🪠', '🚿', '🛁', '🪤', '🪒', '🧴', '🧷', '🧹', '🧺', '🧻', '🪣', '🧼', '🫧', '🪥', '🧽', '🧯', '🛒', '🚬', '⚰️', '🪦', '⚱️', '🗿', '🪧', '🏧', '🚮', '🚰', '♿', '🚹', '🚺', '🚻', '🚼', '🚾', '🛂', '🛃', '🛄', '🛅', '⚠️', '🚸', '⛔', '🚫', '🚳', '🚭', '🚯', '🚱', '🚷', '📵', '🔞', '☢️', '☣️', '⬆️', '↗️', '➡️', '↘️', '⬇️', '↙️', '⬅️', '↖️', '↕️', '↔️', '↩️', '↪️', '⤴️', '⤵️', '🔃', '🔄', '🔙', '🔚', '🔛', '🔜', '🔝', '🛐', '⚛️', '🕉️', '✡️', '☸️', '☯️', '✝️', '☦️', '☪️', '☮️', '🕎', '🔯', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '⛎', '🔀', '🔁', '🔂', '▶️', '⏩', '⏭️', '⏯️', '◀️', '⏪', '⏮️', '🔼', '⏫', '🔽', '⏬', '⏸️', '⏹️', '⏺️', '⏏️', '🎦', '🔅', '🔆', '📶', '📳', '📴', '♀️', '♂️', '⚧️', '✖️', '➕', '➖', '➗', '♾️', '‼️', '⁉️', '❓', '❔', '❕', '❗', '〰️', '💱', '💲', '⚕️', '♻️', '⚜️', '🔱', '📛', '🔰', '⭕', '✅', '☑️', '✔️', '❌', '❎', '➰', '➿', '〽️', '✳️', '✴️', '❇️', '™️', '🔠', '🔡', '🔢', '🔣', '🔤', '🅰️', '🆎', '🅱️', '🆑', '🆒', '🆓', 'ℹ️', '🆔', 'Ⓜ️', '🆕', '🆖', '🅾️', '🆗', '🅿️', '🆘', '🆙', '🆚', '🈁', '🈂️', '🈷️', '🈶', '🈯', '🉐', '🈹', '🈚', '🈲', '🉑', '🈸', '🈴', '🈳', '㊗️', '㊙️', '🈺', '🈵', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '🟤', '⚫', '⚪', '🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '🟫', '⬛', '⬜', '◼️', '◻️', '◾', '◽', '▪️', '▫️', '🔶', '🔷', '🔸', '🔹', '🔺', '🔻', '💠', '🔘', '🔳', '🔲']
        };

        let content = '';

        for (const [category, emojis] of Object.entries(categories)) {
            content += `<div class="emoji-category-title">${category}</div>`;
            content += `<div class="emoji-grid">`;
            emojis.forEach(emoji => {
                if (emoji.length < 5) { // Simple filter for weird strings
                    content += `<span class="emoji-item">${emoji}</span>`;
                }
            });
            content += `</div>`;
        }

        this.popover.innerHTML = content;
        this.wrapper.appendChild(this.popover);
    }

    bindEvents() {
        // Toggle popover
        this.triggerBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.togglePopover();
        });

        // Insert emoji
        this.popover.addEventListener('click', (e) => {
            if (e.target.classList.contains('emoji-item')) {
                this.insertEmoji(e.target.textContent);
                e.preventDefault();
                e.stopPropagation(); // Don't close immediately if we want multiple
                // But usually we close? Let's keep it open for multi insert, user clicks away to close
            }
        });

        // Close on click outside
        document.addEventListener('click', (e) => {
            if (!this.wrapper.contains(e.target)) {
                this.closePopover();
            }
        });
    }

    togglePopover() {
        if (this.popover.style.display === 'none') {
            // Close others first
            document.querySelectorAll('.emoji-popover').forEach(p => p.style.display = 'none');
            this.popover.style.display = 'block';
        } else {
            this.popover.style.display = 'none';
        }
    }

    closePopover() {
        this.popover.style.display = 'none';
    }

    insertEmoji(emoji) {
        const start = this.targetElement.selectionStart;
        const end = this.targetElement.selectionEnd;
        const text = this.targetElement.value;

        const before = text.substring(0, start);
        const after = text.substring(end, text.length);

        this.targetElement.value = before + emoji + after;

        // Move cursor after emoji
        this.targetElement.selectionStart = this.targetElement.selectionEnd = start + emoji.length;
        this.targetElement.focus();

        // Trigger input event for auto-resizing textareas or validation
        this.targetElement.dispatchEvent(new Event('input', { bubbles: true }));
    }
}

export function initEmojiPicker(targetId) {
    return new EmojiPicker(targetId);
}
