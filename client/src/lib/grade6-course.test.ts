import { describe, expect, it } from "vitest";
import { grade6CartoonImageForTerm, grade6CartoonImages } from "./grade6-cartoon-images";
import { grade6CourseLessons, grade6CourseUnits } from "./grade6-course";

describe("Grade 6 course data", () => {
  it("contains only the approved 609 vocabulary and expression records across 20 lessons", () => {
    expect(grade6CourseLessons).toHaveLength(20);
    expect(grade6CourseUnits).toHaveLength(5);
    expect(grade6CourseLessons.flatMap((lesson) => lesson.cards)).toHaveLength(609);
  });

  it("keeps every card displayable with a sentence and fallback image", () => {
    for (const card of grade6CourseLessons.flatMap((lesson) => lesson.cards)) {
      expect(card.sentence).toContain(card.term);
      expect(card.image).toMatch(/^\/manus-storage\//);
    }
  });

  it("maps all reviewed Grade 6 visual assets without losing the lesson fallback", () => {
    expect(Object.keys(grade6CartoonImages)).toHaveLength(66);
    expect(grade6CartoonImageForTerm("coral reefs", "/fallback.png")).toContain("coral-reef");
    expect(grade6CartoonImageForTerm("bench", "/fallback.png")).toContain("park-bench");
    expect(grade6CartoonImageForTerm("coins", "/fallback.png")).toContain("coins-gold");
    expect(grade6CartoonImageForTerm("beach", "/fallback.png")).toContain("summer-beach");
    expect(grade6CartoonImageForTerm("clouds", "/fallback.png")).toContain("wind-turbine");
    expect(grade6CartoonImageForTerm("water", "/fallback.png")).toContain("summer-beach");
    expect(grade6CartoonImageForTerm("factories", "/fallback.png")).toContain("factory");
    expect(grade6CartoonImageForTerm("furniture", "/fallback.png")).toContain("make-furniture");
    expect(grade6CartoonImageForTerm("garbage", "/fallback.png")).toContain("garbage-container");
    expect(grade6CartoonImageForTerm("garbage bags", "/fallback.png")).toContain("garbage-bag");
    expect(grade6CartoonImageForTerm("entrance", "/fallback.png")).toContain("grade6-004-gate");
    expect(grade6CartoonImageForTerm("grain", "/fallback.png")).toContain("crops-farm");
    expect(grade6CartoonImageForTerm("jewelry", "/fallback.png")).toContain("bracelet");
    expect(grade6CartoonImageForTerm("make electricity", "/fallback.png")).toContain("wind-turbine");
    expect(grade6CartoonImageForTerm("harvest", "/fallback.png")).toContain("crops-farm");
    expect(grade6CartoonImageForTerm("hat", "/fallback.png")).toContain("hat-ribbon");
    expect(grade6CartoonImageForTerm("kingfisher", "/fallback.png")).toContain("kingfisher-nature-branch");
    expect(grade6CartoonImageForTerm("hibiscus", "/fallback.png")).toContain("hibiscus-blossom-leaf");
    expect(grade6CartoonImageForTerm("unmapped Grade 6 term", "/fallback.png")).toBe("/fallback.png");
  });
});
