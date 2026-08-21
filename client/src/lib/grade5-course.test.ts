import { describe, expect, it } from 'vitest';
import { grade5CartoonImageFor, grade5CartoonImages } from './grade5-cartoon-images';
import { grade5CourseLessons } from './grade5-course';

describe('Grade 5 course module', () => {
  it('ships the complete extracted course with its dedicated image library', () => {
    const cards = grade5CourseLessons.flatMap((lesson) => lesson.cards);
    const waterWeeds = cards.find((card) => card.term === 'water weeds');

    expect(grade5CourseLessons).toHaveLength(20);
    expect(cards).toHaveLength(609);
    expect(Object.keys(grade5CartoonImages)).toHaveLength(232);
    expect(grade5CourseLessons.every((lesson) => lesson.id.startsWith('grade5-'))).toBe(true);
    expect(waterWeeds).toBeDefined();
    expect(grade5CartoonImageFor(waterWeeds!)).toMatch(/^\/manus-storage\/grade5-/);
  });
});
