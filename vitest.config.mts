import { defineConfig } from "vitest/config";

// 시험은 tests 폴더 안의 *.test.ts 만 돌린다. (삭제 대기 폴더 등은 건드리지 않는다)
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
