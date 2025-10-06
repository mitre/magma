export function sanitizeInput(input) {
    if (typeof input !== "string") {
        return input; 
    }
    return input
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

export function validateInput(input, type) {
    switch (type) {
        case "string":
            return typeof input === "string" && input.trim().length > 0;
        case "number":
            return !isNaN(input);
        case "boolean":
            return typeof input === "boolean";
        default:
            return false; 
    }
}