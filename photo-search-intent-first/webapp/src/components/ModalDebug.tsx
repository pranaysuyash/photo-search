import { useModalContext } from "../contexts/ModalContext";

export function ModalDebug() {
	const { actions: modal, state } = useModalContext();

	// Add console logging to debug
	console.log("ModalDebug component rendered", { state, modal });

	const handleClick = () => {
		console.log("ModalDebug button clicked, opening folder modal");
		modal.open("folder");
	};

	return (
		<div
			className="modal-debug"
			style={{
				position: "fixed",
				top: "10px",
				right: "10px",
				zIndex: 9999,
				background: "white",
				padding: "10px",
				border: "1px solid #ccc",
				borderRadius: "4px",
				boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
				color: "black",
			}}
		>
			<button
				type="button"
				onClick={handleClick}
				style={{
					padding: "8px 16px",
					backgroundColor: "#007bff",
					color: "white",
					border: "none",
					borderRadius: "4px",
					cursor: "pointer",
				}}
			>
				Test Modal
			</button>
			<div
				className="modal-debug-state"
				style={{
					marginTop: "8px",
					fontSize: "12px",
					color: "red",
					fontFamily: "monospace",
				}}
			>
				Modal State: {JSON.stringify(state)}
			</div>
		</div>
	);
}
