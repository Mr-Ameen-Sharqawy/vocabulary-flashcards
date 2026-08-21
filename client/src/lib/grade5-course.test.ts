import { describe, expect, it } from 'vitest';
import { grade5CartoonImageFor, grade5CartoonImages } from './grade5-cartoon-images';
import { grade5CourseLessons } from './grade5-course';

describe('Grade 5 course module', () => {
  it('ships the complete extracted course with its dedicated image library', () => {
    const cards = grade5CourseLessons.flatMap((lesson) => lesson.cards);
    const waterWeeds = cards.find((card) => card.term === 'water weeds');
    const hunt = cards.find((card) => card.term === 'hunt');

    expect(grade5CourseLessons).toHaveLength(20);
    expect(cards).toHaveLength(609);
    expect(Object.keys(grade5CartoonImages)).toHaveLength(290);
    expect(grade5CourseLessons.every((lesson) => lesson.id.startsWith('grade5-'))).toBe(true);
    expect(waterWeeds).toBeDefined();
    expect(hunt).toBeDefined();
    expect(grade5CartoonImageFor(waterWeeds!)).toMatch(/^\/manus-storage\/grade5-/);
    expect(grade5CartoonImageFor(hunt!)).toBe('/manus-storage/cartoon-188-hunt_a1934796.jpeg');
  });
});
