import { Button } from "@/components/ui/shadcn/Button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/shadcn/Card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/shadcn/Dialog";
import { Input } from "@/components/ui/shadcn/Input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/shadcn/Select";

export function UIDemo() {
	return (
		<div className="p-4 space-y-6">
			<h1 className="text-2xl font-bold">shadcn/ui Component Demo</h1>

			{/* Buttons */}
			<Card>
				<CardHeader>
					<CardTitle>Buttons</CardTitle>
					<CardDescription>Various button styles and sizes</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-wrap gap-4">
					<Button>Default</Button>
					<Button variant="destructive">Destructive</Button>
					<Button variant="outline">Outline</Button>
					<Button variant="secondary">Secondary</Button>
					<Button variant="ghost">Ghost</Button>
					<Button variant="link">Link</Button>
				</CardContent>
				<CardContent className="flex flex-wrap gap-4">
					<Button size="sm">Small</Button>
					<Button size="default">Default</Button>
					<Button size="lg">Large</Button>
					<Button size="icon">+</Button>
				</CardContent>
			</Card>

			{/* Form Elements */}
			<Card>
				<CardHeader>
					<CardTitle>Form Elements</CardTitle>
					<CardDescription>Input fields and select components</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<label htmlFor="name">Name</label>
						<Input id="name" placeholder="Enter your name" />
					</div>

					<div className="space-y-2">
						<label htmlFor="email">Email</label>
						<Input id="email" type="email" placeholder="Enter your email" />
					</div>

					<div className="space-y-2">
						<label htmlFor="role">Role</label>
						<Select>
							<SelectTrigger id="role">
								<SelectValue placeholder="Select a role" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="admin">Admin</SelectItem>
								<SelectItem value="user">User</SelectItem>
								<SelectItem value="guest">Guest</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</CardContent>
			</Card>

			{/* Dialog */}
			<Card>
				<CardHeader>
					<CardTitle>Dialog</CardTitle>
					<CardDescription>Modal dialog component</CardDescription>
				</CardHeader>
				<CardContent>
					<Dialog>
						<DialogTrigger asChild>
							<Button variant="outline">Open Dialog</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Confirmation</DialogTitle>
								<DialogDescription>
									Are you sure you want to perform this action? This cannot be
									undone.
								</DialogDescription>
							</DialogHeader>
							<div className="py-4">
								<p>This action will permanently delete the selected items.</p>
							</div>
							<DialogFooter>
								<Button variant="outline">Cancel</Button>
								<Button variant="destructive">Delete</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				</CardContent>
			</Card>
		</div>
	);
}
