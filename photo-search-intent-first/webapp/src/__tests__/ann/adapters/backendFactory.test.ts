/**
 * Tests for Backend Factory
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BackendFactory } from "../../../services/ann/adapters/BackendFactory";
import { ONNXBackend } from "../../../services/ann/adapters/ONNXBackend";
import { PyTorchBackend } from "../../../services/ann/adapters/PyTorchBackend";
import { TensorFlowJSBackend } from "../../../services/ann/adapters/TensorFlowJSBackend";

describe("BackendFactory", () => {
	let factory: BackendFactory;

	beforeEach(() => {
		factory = BackendFactory.getInstance();
		factory.initializeDefaultConfigs();
	});

	afterEach(async () => {
		await factory.shutdownAll();
	});

	describe("Singleton Pattern", () => {
		it("should return the same instance", () => {
			const instance1 = BackendFactory.getInstance();
			const instance2 = BackendFactory.getInstance();
			expect(instance1).toBe(instance2);
		});
	});

	describe("Backend Configuration", () => {
		it("should initialize default configurations", () => {
			const availableTypes = factory.getAvailableBackendTypes();

			expect(availableTypes).toContain("tensorflowjs");
			expect(availableTypes).toContain("pytorch");
			expect(availableTypes).toContain("onnx");
		});

		it("should register custom backend configuration", () => {
			const customConfig = {
				id: "custom-backend",
				name: "Custom Backend",
				description: "A custom backend implementation",
				version: "1.0.0",
				enabled: true,
				priority: 10,
				resourceLimits: {
					maxMemoryMB: 512,
					maxCPUPercent: 50,
					maxGPUCount: 0,
				},
				optimization: {
					enableQuantization: false,
					enablePruning: false,
					enableCaching: true,
				},
				settings: {},
			};

			factory.registerBackend("custom", customConfig);

			expect(factory.isBackendSupported("custom")).toBe(true);
			expect(factory.getBackendConfig("custom")).toEqual(customConfig);
		});

		it("should update backend configuration", () => {
			const updateConfig = {
				priority: 5,
				resourceLimits: {
					maxMemoryMB: 1024,
					maxCPUPercent: 75,
					maxGPUCount: 1,
				},
			};

			factory.updateBackendConfig("tensorflowjs", updateConfig);

			const config = factory.getBackendConfig("tensorflowjs");
			expect(config?.priority).toBe(5);
			expect(config?.resourceLimits.maxMemoryMB).toBe(1024);
		});
	});

	describe("Backend Creation", () => {
		it("should create TensorFlow.js backend", async () => {
			const tfMock = vi
				.spyOn(TensorFlowJSBackend.prototype, "initialize")
				.mockResolvedValue(true);

			const backend = await factory.createBackend("tensorflowjs");

			expect(backend).toBeInstanceOf(TensorFlowJSBackend);
			expect(tfMock).toHaveBeenCalled();

			tfMock.mockRestore();
		});

		it("should create PyTorch backend", async () => {
			const ptMock = vi
				.spyOn(PyTorchBackend.prototype, "initialize")
				.mockResolvedValue(true);

			const backend = await factory.createBackend("pytorch");

			expect(backend).toBeInstanceOf(PyTorchBackend);
			expect(ptMock).toHaveBeenCalled();

			ptMock.mockRestore();
		});

		it("should create ONNX backend", async () => {
			const onnxMock = vi
				.spyOn(ONNXBackend.prototype, "initialize")
				.mockResolvedValue(true);

			const backend = await factory.createBackend("onnx");

			expect(backend).toBeInstanceOf(ONNXBackend);
			expect(onnxMock).toHaveBeenCalled();

			onnxMock.mockRestore();
		});

		it("should throw error for unsupported backend type", async () => {
			await expect(factory.createBackend("unsupported" as any)).rejects.toThrow(
				"Unsupported backend type: unsupported",
			);
		});

		it("should handle backend initialization failure", async () => {
			const tfMock = vi
				.spyOn(TensorFlowJSBackend.prototype, "initialize")
				.mockResolvedValue(false);

			await expect(factory.createBackend("tensorflowjs")).rejects.toThrow(
				"Failed to initialize backend: tensorflowjs",
			);

			tfMock.mockRestore();
		});
	});

	describe("Backend Management", () => {
		it("should get created backend", async () => {
			const tfMock = vi
				.spyOn(TensorFlowJSBackend.prototype, "initialize")
				.mockResolvedValue(true);

			await factory.createBackend("tensorflowjs", { id: "test-tf" });

			const backend = factory.getBackend("test-tf");
			expect(backend).toBeInstanceOf(TensorFlowJSBackend);

			tfMock.mockRestore();
		});

		it("should return null for non-existent backend", () => {
			const backend = factory.getBackend("non-existent");
			expect(backend).toBeNull();
		});

		it("should get all backends", async () => {
			const tfMock = vi
				.spyOn(TensorFlowJSBackend.prototype, "initialize")
				.mockResolvedValue(true);
			const onnxMock = vi
				.spyOn(ONNXBackend.prototype, "initialize")
				.mockResolvedValue(true);

			await factory.createBackend("tensorflowjs", { id: "tf1" });
			await factory.createBackend("onnx", { id: "onnx1" });

			const backends = factory.getAllBackends();

			expect(backends).toHaveLength(2);
			expect(backends[0].id).toBe("tf1");
			expect(backends[1].id).toBe("onnx1");

			tfMock.mockRestore();
			onnxMock.mockRestore();
		});

		it("should shutdown backend", async () => {
			const tfMock = vi
				.spyOn(TensorFlowJSBackend.prototype, "initialize")
				.mockResolvedValue(true);
			const shutdownMock = vi
				.spyOn(TensorFlowJSBackend.prototype, "shutdown")
				.mockResolvedValue();

			await factory.createBackend("tensorflowjs", { id: "test-tf" });
			await factory.shutdownBackend("test-tf");

			expect(shutdownMock).toHaveBeenCalled();
			expect(factory.getBackend("test-tf")).toBeNull();

			tfMock.mockRestore();
			shutdownMock.mockRestore();
		});

		it("should shutdown all backends", async () => {
			const tfMock = vi
				.spyOn(TensorFlowJSBackend.prototype, "initialize")
				.mockResolvedValue(true);
			const onnxMock = vi
				.spyOn(ONNXBackend.prototype, "initialize")
				.mockResolvedValue(true);
			const tfShutdownMock = vi
				.spyOn(TensorFlowJSBackend.prototype, "shutdown")
				.mockResolvedValue();
			const onnxShutdownMock = vi
				.spyOn(ONNXBackend.prototype, "shutdown")
				.mockResolvedValue();

			await factory.createBackend("tensorflowjs", { id: "tf1" });
			await factory.createBackend("onnx", { id: "onnx1" });

			await factory.shutdownAll();

			expect(tfShutdownMock).toHaveBeenCalled();
			expect(onnxShutdownMock).toHaveBeenCalled();
			expect(factory.getAllBackends()).toHaveLength(0);

			tfMock.mockRestore();
			onnxMock.mockRestore();
			tfShutdownMock.mockRestore();
			onnxShutdownMock.mockRestore();
		});
	});

	describe("Health Monitoring", () => {
		it("should get all backend health status", async () => {
			const tfMock = vi
				.spyOn(TensorFlowJSBackend.prototype, "initialize")
				.mockResolvedValue(true);
			const healthMock = vi
				.spyOn(TensorFlowJSBackend.prototype, "getHealth")
				.mockReturnValue({
					status: "healthy" as const,
					lastCheck: Date.now(),
					uptime: 1000,
					errorRate: 0,
					responseTime: 100,
					activeConnections: 1,
					resourceUsage: { memory: 100, cpu: 20, storage: 0 },
				});
			const availableMock = vi
				.spyOn(TensorFlowJSBackend.prototype, "isAvailable")
				.mockReturnValue(true);

			await factory.createBackend("tensorflowjs", { id: "test-tf" });

			const healthStatus = factory.getAllBackendHealth();

			expect(healthStatus).toHaveLength(1);
			expect(healthStatus[0].id).toBe("test-tf");
			expect(healthStatus[0].type).toBe("tensorflowjs");
			expect(healthStatus[0].health.status).toBe("healthy");
			expect(healthStatus[0].available).toBe(true);

			tfMock.mockRestore();
			healthMock.mockRestore();
			availableMock.mockRestore();
		});
	});

	describe("Backend Detection", () => {
		it("should detect available backends", async () => {
			// Mock environment detection
			const originalWebAssembly = global.WebAssembly;
			const originalNavigator = global.navigator;

			global.WebAssembly = {} as any;
			global.navigator = { hardwareConcurrency: 4 } as any;

			// Mock document and canvas for TensorFlow.js detection
			const originalDocument = global.document;
			global.document = {
				createElement: vi.fn().mockReturnValue({
					getContext: vi.fn().mockReturnValue({}),
				}),
			} as any;

			const available = await factory.detectAvailableBackends();

			// Restore globals
			global.WebAssembly = originalWebAssembly;
			global.navigator = originalNavigator;
			global.document = originalDocument;

			expect(Array.isArray(available)).toBe(true);
		});
	});

	describe("Backend Recommendations", () => {
		it("should provide backend recommendations for different tasks", () => {
			const faceDetectionBackend =
				factory.getRecommendedBackend("face_detection");
			const embeddingBackend = factory.getRecommendedBackend("image_embedding");
			const nlpBackend = factory.getRecommendedBackend("nlp");
			const defaultBackend = factory.getRecommendedBackend("unknown_task");

			expect(["tensorflowjs", "pytorch", "onnx"]).toContain(
				faceDetectionBackend || "",
			);
			expect(["tensorflowjs", "pytorch", "onnx"]).toContain(
				embeddingBackend || "",
			);
			expect(["tensorflowjs", "pytorch", "onnx"]).toContain(nlpBackend || "");
			expect(["tensorflowjs", "pytorch", "onnx"]).toContain(
				defaultBackend || "",
			);
		});
	});

	describe("Configuration Management", () => {
		it("should export configurations", () => {
			const configs = factory.exportConfigs();

			expect(configs).toHaveProperty("tensorflowjs");
			expect(configs).toHaveProperty("pytorch");
			expect(configs).toHaveProperty("onnx");

			expect(configs.tensorflowjs.id).toBe("tensorflowjs");
			expect(configs.pytorch.id).toBe("pytorch");
			expect(configs.onnx.id).toBe("onnx");
		});

		it("should import configurations", () => {
			const customConfigs = {
				custom1: {
					id: "custom1",
					name: "Custom Backend 1",
					description: "First custom backend",
					version: "1.0.0",
					enabled: true,
					priority: 15,
					resourceLimits: {
						maxMemoryMB: 256,
						maxCPUPercent: 30,
						maxGPUCount: 0,
					},
					optimization: {
						enableQuantization: true,
						enablePruning: false,
						enableCaching: true,
					},
					settings: {},
				},
				custom2: {
					id: "custom2",
					name: "Custom Backend 2",
					description: "Second custom backend",
					version: "2.0.0",
					enabled: false,
					priority: 5,
					resourceLimits: {
						maxMemoryMB: 512,
						maxCPUPercent: 60,
						maxGPUCount: 1,
					},
					optimization: {
						enableQuantization: false,
						enablePruning: true,
						enableCaching: false,
					},
					settings: {},
				},
			};

			factory.importConfigs(customConfigs);

			expect(factory.isBackendSupported("custom1")).toBe(true);
			expect(factory.isBackendSupported("custom2")).toBe(true);

			const config1 = factory.getBackendConfig("custom1");
			const config2 = factory.getBackendConfig("custom2");

			expect(config1?.name).toBe("Custom Backend 1");
			expect(config2?.name).toBe("Custom Backend 2");
			expect(config2?.enabled).toBe(false);
		});
	});

	describe("Multiple Backend Creation", () => {
		it("should create multiple backends", async () => {
			const tfMock = vi
				.spyOn(TensorFlowJSBackend.prototype, "initialize")
				.mockResolvedValue(true);
			const onnxMock = vi
				.spyOn(ONNXBackend.prototype, "initialize")
				.mockResolvedValue(true);

			const configs = [
				{ type: "tensorflowjs" as const, config: { id: "tf1" } },
				{ type: "onnx" as const, config: { id: "onnx1" } },
			];

			const backends = await factory.createBackends(configs);

			expect(backends).toHaveLength(2);
			expect(backends[0].id).toBe("tf1");
			expect(backends[1].id).toBe("onnx1");

			tfMock.mockRestore();
			onnxMock.mockRestore();
		});

		it("should handle partial failures in multiple backend creation", async () => {
			const tfMock = vi
				.spyOn(TensorFlowJSBackend.prototype, "initialize")
				.mockResolvedValue(true);
			const onnxMock = vi
				.spyOn(ONNXBackend.prototype, "initialize")
				.mockRejectedValue(new Error("Failed"));

			const configs = [
				{ type: "tensorflowjs" as const, config: { id: "tf1" } },
				{ type: "onnx" as const, config: { id: "onnx1" } },
			];

			const backends = await factory.createBackends(configs);

			expect(backends).toHaveLength(1);
			expect(backends[0].id).toBe("tf1");

			tfMock.mockRestore();
			onnxMock.mockRestore();
		});
	});
});
