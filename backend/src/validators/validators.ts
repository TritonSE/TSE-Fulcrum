import e from "express";

// https://stackoverflow.com/a/50375286
type UnionToIntersection<U> = (U extends any ? (u: U) => void : never) extends ((u: infer I) => void) ? I : never;

type UndefinedToOptional<T> = UnionToIntersection<
  {
    [K in keyof T]: (
      T[K] extends undefined
        ? {}
        : undefined extends T[K]
          ? {[key in K]?: T[K]}
          : {[key in K]: T[K]}
    )
  }[keyof T]
>;

type TupleOf<T> = readonly [] | readonly [T, ...T[]];

type Primitive = bigint | boolean | null | number | string | symbol;

function isPrimitive(input: unknown): input is Primitive {
  switch (typeof input) {
    case "bigint":
    case "boolean":
    case "number":
    case "string":
    case "symbol":
      return true;
    case "object":
      return input === null;
    default:
      return false;
  }
}

type Transformer<I, O, E = I> = (input: I) => O;

interface ObjectSpec {
  readonly [key: string]: Primitive | Transformer<unknown, unknown> | TupleSpec | ObjectSpec | undefined;
}

type TransformSpec = Exclude<ObjectSpec[string], undefined>;
type TupleSpec = readonly [] | readonly [TransformSpec, ...TransformSpec[]];

// all inputs that transform successfully should match this type - the more specific the better
type NarrowestInput<S> = (
  S extends Primitive
  ? S
  : S extends Transformer<infer I, infer O, infer E>
    ? I & E
      : S extends TupleSpec
        ? {readonly [K in keyof S]: K extends keyof [] ? S[K] : NarrowestInput<S[K]>}
        : S extends ObjectSpec
          ? UndefinedToOptional<{readonly [K in keyof S]: NarrowestInput<S[K]>}>
          : never
);

// all inputs that can be validated by this transformer
type WidestInput<S> = (
  S extends Primitive
  ? unknown
  : S extends Transformer<infer I, infer O, infer E>
    ? I
      : S extends TupleSpec
        ? unknown
        : S extends ObjectSpec
          ? unknown
          : never
);

type Output<S> = (
  S extends Primitive
    ? S
    : S extends Transformer<infer I, infer O, infer E>
      ? O
      : S extends TupleSpec
        ? {-readonly [K in keyof S]: K extends keyof [] ? S[K] : Output<S[K]>}
        : S extends ObjectSpec
          ? UndefinedToOptional<{-readonly [K in keyof S]: Output<S[K]>}>
          : never
);

function transformPrimitive<S extends Primitive>(input: WidestInput<S>, spec: S): Output<S> {
  if (input === spec) {
    return spec as Output<S>;
  }
  throw new Error("Values do not match");
}

function transformTuple<S extends TupleSpec>(input: WidestInput<S>, spec: S): Output<S> {
  if (!Array.isArray(input)) {
    throw new Error("Not an array");
  }
  if (input.length !== spec.length) {
    throw new Error("Wrong length");
  }

  // @ts-ignore
  const transformed = [] as Output<S>;
  for (let i = 0; i < spec.length; i++) {
    try {
      const transformedValue = transform(input[i], spec[i]);
      // @ts-ignore
      transformed.append(transformedValue);
    } catch (e) {
      throw e;
    }
  }
  return transformed;
}

function transformObject<S extends ObjectSpec>(input: WidestInput<S>, spec: S): Output<S> {
  if (typeof input !== "object" || input === null) {
    throw new Error("Not an object");
  }

  for (const key of Object.getOwnPropertyNames(input)) {
    if (!(key in spec)) {
      throw new Error("Extra key");
    }
  }

  const transformed = {} as Output<S>;
  for (const key of Object.getOwnPropertyNames(spec)) {
    const valueSpec = spec[key];
    if (valueSpec === undefined) {
      continue;
    }
    const inputValue: unknown = (input as any)[key];
    try {
      const transformedValue = transform(inputValue, valueSpec);
      if (transformedValue !== undefined) {
        // @ts-ignore
        transformed[key] = transformedValue;
      }
    } catch (e) {
      throw e;
    }
  }

  return transformed;
}

function transform<S extends TransformSpec>(input: WidestInput<S>, spec: S): Output<S> {
  if (isPrimitive(spec)) {
    return transformPrimitive(input, spec) as Output<S>;
  }
  if (typeof spec === "function") {
    return spec(input) as Output<S>;
  }
  if (Array.isArray(spec)) {
    return transformTuple(input, spec as TupleSpec) as Output<S>;
  }
  return transformObject(input, spec as ObjectSpec) as Output<S>;
}

const boolean: Transformer<unknown, boolean, boolean> = (input) => {
  if (typeof input === "boolean") {
    return input;
  } else {
    throw new Error();
  }
}

const number: Transformer<unknown, number, number> = (input) => {
  if (typeof input === "number") {
    return input;
  }
  throw new Error();
}

const string: Transformer<unknown, string, string> = (input) => {
  if (typeof input === "string") {
    return input;
  }
  throw new Error();
}

function optional<S extends TransformSpec>(spec: S): Transformer<WidestInput<S> | undefined, Output<S> | undefined, NarrowestInput<S> | undefined> {
  return (input) => {
    if (input === undefined) {
      return undefined;
    }
    return transform(input, spec);
  };
}

/*
function union<S extends TransformSpec, T extends TransformSpec>(first: S, second: T): TransformFunction<unknown, TransformOutput<S> | TransformOutput<T>, TransformInput<S> | TransformInput<T>> {
  return (input) => {
    try {
      return transform(input, first);
    } catch (e) {
      return transform(input, second);
    }
  }
}
*/

/*
type UnionSpec = TransformSpec | Transformer<never, unknown>;

// @ts-ignore
function union<S extends [UnionSpec, ...UnionSpec[]]>(...specs: S): Transformer<UnionToIntersection<WidestInput<S>[number]>, Output<S>[number], NarrowestInput<S>[number]> {
  return (input) => {
    for (let i = 0; i < specs.length; i++) {
      try {
        const spec = specs[i];
        if (typeof spec === "function") {
          return spec(input as never) as any;
        } else {
          return transform(input, spec);
        }
      } catch (e) {
        throw e;
      }
    }
  }
}
*/

function union<S extends readonly [TransformSpec, ...TransformSpec[]]>(...specs: S): Transformer<
    unknown, // UnionToIntersection<{ [K in keyof S]: K extends keyof [] ? never : WidestInput<S[K]> }[keyof S]>,
    Output<S>[number],
    // @ts-ignore
    NarrowestInput<S>[number], // { [K in keyof S]: K extends keyof [] ? never : NarrowestInput<S[K]> }[keyof S]
> {
  return (input) => {
    for (let i = 0; i < specs.length; i++) {
      try {
        return transform(input, specs[i]);
      } catch (e) {
        throw e;
      }
    }
  }
}

/*
function union2<I, O, E, S extends readonly [Transformer<I, O, E>, ...Transformer<I, O, E>[]]>(...transformers: S): Transformer<
  I, O, E
> {
  return (input) => {
    for (let i = 0; i < transformers.length; i++) {
      try {
        return transformers[i](input);
      } catch (e) {
        throw e;
      }
    }
    throw new Error();
  }
}

function union3<I, S extends readonly [(input: any) => any, ...((input: any) => any)[]]>(...transformers: S): Transformer<
  Parameters<S[number]>[0],
  ReturnType<S[number]>,
  NarrowestInput<S[number]>> {
    return (input) => {
      for (let i = 0; i < transformers.length; i++) {
        try {
          return transformers[i](input);
        } catch (e) {
          throw e;
        }
      }
    throw new Error();
    }
}
*/

function transformerUnion<I, O, E = I>(...transformers: Transformer<I, O, E>[]): Transformer<I, O, E> {
  return (input) => {
    for (let i = 0; i < transformers.length; i++) {
      try {
        return transformers[i](input);
      } catch (e) {
        throw e;
      }
    }
    throw new Error();
  }
}

// function union3<S extends readonly [Transformer, ...Transformer[]]>(...transformers: S): Transformer<

/*
function unionTransform<S extends [Transformer<never, unknown>, ...Transformer<never, unknown>[]]>(...transformers: S): Transformer<
    UnionToIntersection<{ [K in keyof S]: K extends keyof [] ? never : WidestInput<S[K]> }[keyof S]>,
    { [K in keyof S]: K extends keyof [] ? never : Output<S[K]> }[keyof S],
    { [K in keyof S]: K extends keyof [] ? never : NarrowestInput<S[K]> }[keyof S]> {
  return (input) => {
    for (let i = 0; i < transformers.length; i++) {
      try {
        return transformers[i](input as never) as any;
      } catch (e) {
        throw e;
      }
    }
  }
}
*/

const fooSpec = {
  baz: union(string, number, optional(boolean)),
  test: union(number, string),
  // stuff: union2<unknown, number | string, number | string, [typeof number, typeof string]>(number, string),
  rad: transformerUnion<unknown, number | string, number | string>(number, string), // union3(number, string, (x: string) => x + "hi"),
  brob: transformerUnion<string, number | Date>((x: string) => parseInt(x), (x: string) => new Date(x)),
};
const test: ObjectSpec = fooSpec;

// const fooSpec = (bar: string) => parseInt(bar);

type FooWide = WidestInput<typeof fooSpec>;
type FooNarrow = NarrowestInput<typeof fooSpec>;
type FooOutput = Output<typeof fooSpec>;

/*
const bar = union3(number, (x: string) => x + "hi"); // unionTransform((x: string) => parseInt(x));

type BarWide = WidestInput<typeof bar>;
type BarNarrow = NarrowestInput<typeof bar>;
type BarOutput = Output<typeof bar>;
*/

const numberValidationSpec = {
  min: optional(number),
  max: optional(number),
  integer: optional(boolean),
  real: boolean,
  foo: undefined,
};

type NumberValidationInput = NarrowestInput<typeof numberValidationSpec>;
type NumberValidationOutput = Output<typeof numberValidationSpec>;

type MinValidation = Output<typeof numberValidationSpec["min"]>;

type NumberValidation = Output<typeof numberValidationSpec>;
type bar = NumberValidation["min"];

type baz = NarrowestInput<typeof numberValidationSpec>;

type Test = {
  a: boolean;
  b: number | undefined;
}

function validatedNumber(options: NumberValidationInput): Transformer<unknown, number> {
  return (input) => {
    const num = number(input);
    if (options.min !== undefined && !(options.min <= num)) {
      throw new Error("Too large");
    }
    // TODO remaining conditions
    return num;
  };
}

const foo = validatedNumber({ real: false })(7);

export {
  number,
}
