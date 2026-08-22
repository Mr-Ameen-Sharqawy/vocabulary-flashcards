import { describe, expect, it } from 'vitest';
import { grade5Aug22CartoonImages } from './grade5-aug22-images';
import { grade5BroadCartoonImages } from './grade5-broad-images';
import { grade5CartoonImageFor, grade5CartoonImages } from './grade5-cartoon-images';
import { grade5CourseLessons, grade5InteractiveLessons } from './grade5-course';
import { grade5FinalCartoonImages } from './grade5-final-images';

describe('Grade 5 course module', () => {
  it('ships the complete extracted course with its dedicated image library', () => {
    const cards = grade5CourseLessons.flatMap((lesson) => lesson.cards);
    const waterWeeds = cards.find((card) => card.term === 'water weeds');
    const hunt = cards.find((card) => card.term === 'hunt');
    const roads = cards.find((card) => card.term === 'roads');
    const awfulTerrible = cards.find((card) => card.term === 'awful / terrible');

    expect(grade5CourseLessons).toHaveLength(20);
    expect(cards).toHaveLength(609);
    expect(Object.keys(grade5CartoonImages)).toHaveLength(560);
    expect(grade5CourseLessons.every((lesson) => lesson.id.startsWith('grade5-'))).toBe(true);
    expect(waterWeeds).toBeDefined();
    expect(hunt).toBeDefined();
    expect(roads).toBeDefined();
    expect(awfulTerrible).toBeDefined();
    expect(grade5CartoonImageFor(waterWeeds!)).toMatch(/^\/manus-storage\/grade5-/);
    expect(grade5CartoonImageFor(hunt!)).toBe('/manus-storage/cartoon-188-hunt_a1934796.jpeg');
    expect(grade5CartoonImageFor(roads!)).toMatch(/^\/manus-storage\/grade5-new-001-/);
    expect(grade5CartoonImageFor(awfulTerrible!)).toMatch(/^\/manus-storage\/grade5-new-019-/);
  });

  it('keeps the empty story lesson out of the interactive deck', () => {
    expect(grade5CourseLessons.find((lesson) => lesson.id === 'grade5-unit-6-lesson-story')?.cards).toEqual([]);
    expect(grade5InteractiveLessons.every((lesson) => lesson.cards.length > 0)).toBe(true);
    expect(grade5InteractiveLessons.some((lesson) => lesson.id === 'grade5-unit-6-lesson-story')).toBe(false);
  });

  it('makes all broad-review image links available to Grade 5 cards', () => {
    expect(Object.keys(grade5BroadCartoonImages)).toHaveLength(111);
    for (const [term, imageUrl] of Object.entries(grade5BroadCartoonImages)) {
      expect(grade5CartoonImages[term]).toBe(imageUrl);
    }
    const fried = grade5InteractiveLessons.flatMap((lesson) => lesson.cards).find((card) => card.term === 'fried');
    expect(fried).toBeDefined();
    expect(grade5CartoonImageFor(fried!)).toMatch(/^\/manus-storage\/grade5-broad-/);
  });

  it('makes all August 22 archive image links available to Grade 5 cards', () => {
    expect(Object.keys(grade5Aug22CartoonImages)).toHaveLength(90);
    for (const [term, imageUrl] of Object.entries(grade5Aug22CartoonImages)) {
      expect(grade5CartoonImages[term]).toBe(imageUrl);
    }
    const valuable = grade5InteractiveLessons.flatMap((lesson) => lesson.cards).find((card) => card.term === 'valuable');
    expect(valuable).toBeDefined();
    expect(grade5CartoonImageFor(valuable!)).toMatch(/^\/manus-storage\/grade5-aug22-/);
  });

  it('makes the final eight user-provided image links available to Grade 5 cards', () => {
    expect(Object.keys(grade5FinalCartoonImages)).toHaveLength(8);
    for (const [term, imageUrl] of Object.entries(grade5FinalCartoonImages)) {
      expect(grade5CartoonImages[term]).toBe(imageUrl);
    }
    const controlled = grade5InteractiveLessons.flatMap((lesson) => lesson.cards).find((card) => card.term === 'controlled');
    expect(controlled).toBeDefined();
    expect(grade5CartoonImageFor(controlled!)).toMatch(/^\/manus-storage\/Child_controls_remote-control_car_/);
  });
});
