import { EnhancedWelcome } from "../components/EnhancedWelcome";

// Demo component to showcase the EnhancedWelcome component
export function EnhancedWelcomeDemo() {
	const handleStartDemo = () => {
		console.log("Starting demo...");
		alert("Demo would start here! 🚀");
	};

	const handleSelectFolder = () => {
		console.log("Selecting folder...");
		alert("Folder picker would open here! 📁");
	};

	const handleStartTour = () => {
		console.log("Starting tour...");
		alert("Interactive tour would begin here! 🎯");
	};

	const handleOpenHelp = () => {
		console.log("Opening help...");
		alert("Help documentation would open here! ❓");
	};

	return (
		<div className="min-h-screen">
			<EnhancedWelcome
				onStartDemo={handleStartDemo}
				onSelectFolder={handleSelectFolder}
				onStartTour={handleStartTour}
				onOpenHelp={handleOpenHelp}
				isFirstVisit={true}
			/>
		</div>
	);
}

export default EnhancedWelcomeDemo;
