"use client";

export function PrintTriggerButton() {
    return (
        <button
            type="button"
            onClick={() => window.print()}
            style={{
                padding: "5px 14px",
                background: "#1F497D",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: "bold",
            }}
        >
            Print / Save as PDF
        </button>
    );
}
