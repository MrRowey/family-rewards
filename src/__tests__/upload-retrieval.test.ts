import { beforeEach, describe, expect, it, vi } from "vitest";

const { readFile } = vi.hoisted(() => ({ readFile: vi.fn() }));
vi.mock("fs/promises", () => ({ readFile }));

import { GET } from "@/app/api/uploads/[filename]/route";

const filename = "a".repeat(32) + ".png";
const context = (name: string) => ({ params: Promise.resolve({ filename: name }) });
const request = new Request("http://localhost/api/uploads/" + filename);

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.UPLOAD_DIR;
});

describe("uploaded image retrieval", () => {
  it("serves valid images with the expected content type and caching headers", async () => {
    readFile.mockResolvedValue(Buffer.from([137, 80, 78, 71]));
    const response = await GET(request, context(filename));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("cache-control")).toContain("immutable");
    expect(readFile).toHaveBeenCalledTimes(1);
  });

  it("reads from the configured persistent upload directory", async () => {
    process.env.UPLOAD_DIR = "/app/uploads";
    readFile.mockResolvedValue(Buffer.from([1]));
    await GET(request, context(filename));
    expect(readFile).toHaveBeenCalledWith(expect.stringContaining("uploads"));
    expect(readFile.mock.calls[0][0].replaceAll("\\", "/")).toContain("/app/uploads/");
  });

  it("rejects traversal and malformed filenames before filesystem access", async () => {
    for (const name of ["../secrets.png", "other.png", "a".repeat(32) + ".svg", "A".repeat(32) + ".png"]) {
      const response = await GET(request, context(name));
      expect(response.status).toBe(404);
    }
    expect(readFile).not.toHaveBeenCalled();
  });

  it("returns 404 for missing uploaded files", async () => {
    readFile.mockRejectedValue(Object.assign(new Error("missing"), { code: "ENOENT" }));
    const response = await GET(request, context(filename));
    expect(response.status).toBe(404);
  });
});
