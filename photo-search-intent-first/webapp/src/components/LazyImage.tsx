import type React from "react";
import { useEffect, useRef, useState } from "react";

type LazyImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
	src: string;
	placeholderColor?: string;
};

export function LazyImage({
	src,
	alt = "",
	placeholderColor = "#f3f4f6",
	...rest
}: LazyImageProps) {
	const imgRef = useRef<HTMLImageElement | null>(null);
	const [visible, setVisible] = useState(false);
	const [loaded, setLoaded] = useState(false);

	useEffect(() => {
		const el = imgRef.current;
		if (!el) return;
		const obs = new IntersectionObserver(
			(entries) => {
				const entry = entries[0];
				if (entry.isIntersecting) {
					setVisible(true);
					obs.disconnect();
				}
			},
			{ rootMargin: "200px" },
		);
		obs.observe(el);
		return () => obs.disconnect();
	}, []);

	return (
		<>
			{!visible && (
				<div
					style={{ backgroundColor: placeholderColor }}
					aria-hidden="true"
					className="w-full h-full"
				/>
			)}
			<img
				ref={imgRef}
				src={visible ? src : undefined}
				alt={alt}
				onLoad={() => setLoaded(true)}
				style={{ opacity: loaded ? 1 : 0, transition: "opacity 200ms ease" }}
				{...rest}
			/>
		</>
	);
}

export default LazyImage;
