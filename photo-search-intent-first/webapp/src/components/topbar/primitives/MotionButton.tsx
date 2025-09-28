import { type MotionProps, motion } from "framer-motion";
import type { ButtonHTMLAttributes } from "react";
import { forwardRef } from "react";

const envMode =
	typeof import.meta !== "undefined" && import.meta.env
		? import.meta.env.MODE
		: process.env.NODE_ENV;

const isTestEnv = envMode === "test";

// Merge dom button props with optional motion props so consumers can remain agnostic.
export type MotionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
	MotionProps;

export const MotionButton = forwardRef<HTMLButtonElement, MotionButtonProps>(
	(props, ref) => {
		if (isTestEnv) {
			const {
				whileHover: _whileHover,
				whileTap: _whileTap,
				whileFocus: _whileFocus,
				whileInView: _whileInView,
				animate: _animate,
				transition: _transition,
				variants: _variants,
				initial: _initial,
				exit: _exit,
				layout: _layout,
				layoutId: _layoutId,
				...rest
			} = props as MotionButtonProps & Record<string, unknown>;

			return <button type="button" ref={ref} {...rest} />;
		}

		return <motion.button {...props} ref={ref} />;
	},
);

MotionButton.displayName = "MotionButton";
