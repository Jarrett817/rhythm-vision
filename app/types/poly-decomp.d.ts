declare module "poly-decomp" {
  type Point = { x: number; y: number };
  type Polygon = Point[];

  function decomp(polygon: Polygon): Polygon[] | null;

  export default decomp;
}
