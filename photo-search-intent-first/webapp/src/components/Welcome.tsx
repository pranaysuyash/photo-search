interface WelcomeProps {
	onStartDemo: () => void;
	onSelectFolder: () => void;
	onClose: () => void;
}

export function Welcome({
	onStartDemo,
	onSelectFolder,
	onClose,
}: WelcomeProps) {
	return (
		<div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
			<div
				className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="p-8">
					<div className="text-center">
						<div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto flex items-center justify-center mb-6">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="w-12 h-12 text-white"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
								/>
							</svg>
						</div>

						<h1 className="text-3xl font-bold text-gray-900 mb-4">
							Find any photo instantly
						</h1>
						<p className="text-gray-600 mb-8 max-w-xl mx-auto">
							Just describe what you're looking for - like "that beach sunset"
							or "my daughter's birthday" - and we'll find it. No more endless
							scrolling!
						</p>

						<div className="grid md:grid-cols-2 gap-6 mb-8">
							<div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 text-left">
								<div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										className="w-6 h-6 text-blue-600"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
										/>
									</svg>
								</div>
								<h3 className="text-xl font-semibold text-gray-900 mb-2">
									Search naturally
								</h3>
								<p className="text-gray-600 text-sm">
									Type what you remember - "kids at the park" or "that amazing
									sunset" - we'll find it.
								</p>
							</div>

							<div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 text-left">
								<div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										className="w-6 h-6 text-purple-600"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
										/>
									</svg>
								</div>
								<h3 className="text-xl font-semibold text-gray-900 mb-2">
									Find people instantly
								</h3>
								<p className="text-gray-600 text-sm">
									We recognize faces so you can find all photos of someone
									special in seconds.
								</p>
							</div>
						</div>

						<div className="flex flex-col sm:flex-row gap-4 justify-center">
							<button
								type="button"
								onClick={onStartDemo}
								className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg"
							>
								See it in action
							</button>
							<button
								type="button"
								onClick={onSelectFolder}
								className="px-8 py-4 bg-white border-2 border-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-50 transition-all shadow-md"
							>
								Use my photos
							</button>
						</div>

						<button
							type="button"
							onClick={onClose}
							className="mt-6 text-gray-500 hover:text-gray-700 transition-colors"
						>
							Maybe later
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
