import { describe, expect, it } from "bun:test";
import { parseTokenUriMetadata } from "./useCommissionRoadNftMetadata";

describe("parseTokenUriMetadata", () => {
  it("extracts on-chain CommissionRoad image data", () => {
    const imageUrl = "data:image/svg+xml;base64,PHN2Zy8+";
    const tokenUri = `data:application/json;base64,${btoa(
      JSON.stringify({
        image_data: imageUrl,
        name: "CommissionRoad #1",
      }),
    )}`;

    expect(parseTokenUriMetadata(tokenUri)).toEqual({
      imageUrl,
      name: "CommissionRoad #1",
    });
  });

  it("ignores non-image metadata URLs", () => {
    const tokenUri = `data:application/json,${encodeURIComponent(
      JSON.stringify({
        image_data: "javascript:alert(1)",
        name: "CommissionRoad #1",
      }),
    )}`;

    expect(parseTokenUriMetadata(tokenUri)).toEqual({
      imageUrl: undefined,
      name: "CommissionRoad #1",
    });
  });
});
