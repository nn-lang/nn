import { Size } from "../resolver";

import { SizeType } from "./sizetype";

export interface Polynomial {
  product: Map<Size, Polynomial>;
  divisor?: Polynomial;

  constant: number;
}

export namespace Polynomial {
  export function from(sizeType: SizeType): Polynomial {
    switch (sizeType.computeKind) {
      case "pow":
      case "mul":
      case "div":
      case "add":
      case "sub":
        return Polynomial[sizeType.computeKind](
          from(sizeType.left),
          from(sizeType.right),
        );
      case "ident":
        return ident(sizeType.left as Size);
      case "number":
        return constant(sizeType.left as number);
    }
  }

  export function pow(_left: Polynomial, _right: Polynomial): Polynomial {
    // TODO
    throw new Error("Not implemented");
  }

  export function constant(c: number): Polynomial {
    return {
      product: new Map(),
      constant: c,
    };
  }

  export function ident(size: Size): Polynomial {
    return {
      product: new Map([[size, constant(1)]]),
      constant: 0,
    };
  }

  export function isConstant(p: Polynomial): boolean {
    return p.product.size === 0;
  }

  export function isSame(p: Polynomial, q: Polynomial): boolean {
    const cleanedP = clean(p);
    const cleanedQ = clean(q);

    if (cleanedP.constant !== cleanedQ.constant) {
      return false;
    }

    if (cleanedP.product.size !== cleanedQ.product.size) {
      return false;
    }

    for (const [size, value] of cleanedP.product) {
      if (!cleanedQ.product.has(size)) {
        return false;
      }

      if (!isSame(value, cleanedQ.product.get(size)!)) {
        return false;
      }
    }

    return true;
  }

  export function assign(
    p: Polynomial,
    map: Map<Size, Polynomial>,
  ): Polynomial {
    const result = copy(p);

    for (const [size, value] of p.product) {
      if (map.has(size)) {
        result.product.delete(size);
        add(result, mul(map.get(size)!, assign(value, map)));
      }
    }

    if (result.divisor) {
      result.divisor = assign(result.divisor, map);
    }

    return clean(result);
  }

  export function add(left: Polynomial, right: Polynomial): Polynomial {
    left.constant += right.constant;

    for (const [size, value] of right.product) {
      if (left.product.has(size)) {
        left.product.set(size, add(left.product.get(size)!, value));
      } else {
        left.product.set(size, value);
      }
    }

    return clean(left);
  }

  export function sub(left: Polynomial, right: Polynomial): Polynomial {
    left.constant -= right.constant;

    for (const [size, value] of right.product) {
      if (left.product.has(size)) {
        left.product.set(size, sub(left.product.get(size)!, value));
      } else {
        left.product.set(size, mul(constant(-1), value));
      }
    }

    return clean(left);
  }

  export function mul(left: Polynomial, right: Polynomial): Polynomial {
    const greaterOrEqual = (p: Polynomial, size: Size): Polynomial => {
      const result = copy(p);

      p.product.forEach((_, key) => {
        if (key.ident < size.ident) {
          result.product.delete(key);
        }
      });

      return result;
    };

    const greater = (p: Polynomial, size: Size): Polynomial => {
      const result = copy(p);

      p.product.forEach((_, key) => {
        if (key.ident <= size.ident) {
          result.product.delete(key);
        }
      });

      return result;
    };

    const lefts: Polynomial = [...left.product]
      .map(([size, value]): [Size, Polynomial] => {
        return [size, mul(value, greaterOrEqual(right, size))];
      })
      .reduce((acc, [size, value]) => {
        acc.product.set(size, value);
        return acc;
      }, Polynomial.constant(0));

    const rights: Polynomial = [...right.product]
      .map(([size, value]): [Size, Polynomial] => {
        return [size, mul(greater(left, size), value)];
      })
      .reduce((acc, [size, value]) => {
        acc.product.set(size, value);
        return acc;
      }, Polynomial.constant(0));

    return clean(
      add(
        add(lefts, rights),
        Polynomial.constant(left.constant * right.constant),
      ),
    );
  }

  export function div(left: Polynomial, right: Polynomial): Polynomial {
    if (right.product.size) {
      const result = copy(left);
      result.divisor = copy(right);

      return result;
    }

    if (right.constant === 1) {
      return left;
    }

    const result = copy(left);
    result.constant /= right.constant;

    for (const [size, value] of left.product) {
      result.product.set(size, div(value, right));
    }

    return clean(result);
  }

  export function copy(p: Polynomial): Polynomial {
    return {
      product: new Map(
        [...p.product].map(([size, value]) => [size, copy(value)]),
      ),
      constant: p.constant,
      divisor: p.divisor && copy(p.divisor),
    };
  }

  export function clean(p: Polynomial): Polynomial {
    let result = copy(p);

    for (const [size, value] of p.product) {
      if (value.constant === 0 && value.product.size === 0) {
        result.product.delete(size);
      }

      clean(value);
    }

    if (p.divisor && p.divisor.product.size === 0) {
      const divisor = p.divisor;
      delete p.divisor;

      result = div(p, divisor);
    }

    return result;
  }

  export function inspect(p: Polynomial): string {
    const product = [...p.product]
      .map(([size, value]) => {
        const child = inspect(value);

        if (child === "1") {
          return `${size.ident}`;
        } else {
          return `${size.ident} * ${child}`;
        }
      })
      .join(" + ");

    if (p.constant === 0) {
      return product;
    } else if (product.length === 0) {
      return p.constant.toString();
    } else {
      return `(${product} + ${p.constant})`;
    }
  }
}
