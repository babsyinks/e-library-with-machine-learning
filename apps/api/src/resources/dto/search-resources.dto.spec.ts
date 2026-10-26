import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { SearchResourcesDto } from "./search-resources.dto";

describe("SearchResourcesDto", () => {
  it("converts numeric query parameters before validation", async () => {
    const dto = plainToInstance(SearchResourcesDto, {
      year: "2025",
      page: "2",
      limit: "12",
    });

    expect(dto).toMatchObject({ year: 2025, page: 2, limit: 12 });
    await expect(validate(dto)).resolves.toHaveLength(0);
  });
});
