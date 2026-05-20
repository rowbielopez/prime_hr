"use client";

export function PrintTriggerButton() {
    return (
        <button
            type="button"
            onClick={() => window.print()}
            style={{
                padding: "6px 14px",
                background: "#7f1d1d",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: "bold",
            }}
        >
            Print Service Record
        </button>
    );
}