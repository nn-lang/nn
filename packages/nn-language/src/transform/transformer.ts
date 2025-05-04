import { Node } from "./node";

export interface Transformer<Prev extends Node, Next extends Node> {
  transform(prev: Prev): Next;
}

export function createTransformer<Prev extends Node, Next extends Node>(
  transformFn: (prev: Prev) => Next
): Transformer<Prev, Next> {
  return {
    transform: transformFn,
  };
}

export function composeTransformers<A extends Node, B extends Node, C extends Node>(
  t1: Transformer<A, B>,
  t2: Transformer<B, C>
): Transformer<A, C> {
  return createTransformer((a: A) => t2.transform(t1.transform(a)));
}

export function pipe<A extends Node, B extends Node, C extends Node>(
  t1: Transformer<A, B>,
  t2: Transformer<B, C>
): Transformer<A, C>;

export function pipe<A extends Node, B extends Node, C extends Node, D extends Node>(
  t1: Transformer<A, B>,
  t2: Transformer<B, C>,
  t3: Transformer<C, D>
): Transformer<A, D>;

export function pipe<A extends Node, B extends Node, C extends Node, D extends Node, E extends Node>(
  t1: Transformer<A, B>,
  t2: Transformer<B, C>,
  t3: Transformer<C, D>,
  t4: Transformer<D, E>
): Transformer<A, E>;

export function pipe<A extends Node, Z extends Node>(
  ...transformers: Transformer<any, any>[]
): Transformer<A, Z> {
  return transformers.reduce(composeTransformers);
}

export function transform<Prev extends Node, Next extends Node>(
  prev: Prev,
  transformer: Transformer<Prev, Next>
): Next {
  return transformer.transform(prev);
}

export function transformMany<Prev extends Node, Next extends Node>(
  prevs: Prev[],
  transformer: Transformer<Prev, Next>
): Next[] {
  return prevs.map((prev) => transformer.transform(prev));
}

export function identity<T extends Node>(): Transformer<T, T> {
  return createTransformer((node: T) => node);
}
