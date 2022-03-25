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

function compile<S extends TransformSpec>(spec: S): Transformer<WidestInput<S>, Output<S>, NarrowestInput<S>> {
  return (input) => transform(input, spec);
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

function replaceWith<T>(value: T): Transformer<unknown, T> {
  return (input) => value;
}

const remove = replaceWith(undefined);

const placeholder = ((input) => {
  throw new Error();
}) as TransformSpec;

function optional<S extends TransformSpec>(spec: S): Transformer<WidestInput<S> | undefined, Output<S> | undefined, NarrowestInput<S> | undefined> {
  return (input) => {
    if (input === undefined) {
      return undefined;
    }
    return transform(input, spec);
  };
}

function union<S extends readonly [TransformSpec, ...TransformSpec[]]>(...specs: S): Transformer<
    unknown,
    Output<S>[number],
    // @ts-ignore
    NarrowestInput<S>[number],
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

type RecursiveTransformerUnion<I, O, E, S> = (
  S extends readonly []
  ? [I, O, E]
  : S extends readonly [infer T, ...infer R]
    ? T extends Transformer<infer J, infer P, infer F>
      ? RecursiveTransformerUnion<I & WidestInput<T>, O | Output<T>, E | NarrowestInput<T>, R>
      : never
    : never
);

type TransformerUnion<S> = RecursiveTransformerUnion<unknown, never, never, S>;

type RecursiveTransformerChain<I, O, E, S> = (
  S extends readonly []
    ? [I, O, E]
    : S extends readonly [infer T, ...infer R]
      ? T extends Transformer<O, infer P, infer F>
        ? RecursiveTransformerChain<I, P, E, R>
        : never
      : never
);

type TransformerChain<S> = (
  S extends [infer T, ...infer R]
    ? T extends Transformer<infer I, infer O, infer E>
      ? RecursiveTransformerChain<WidestInput<T>, Output<T>, NarrowestInput<T>, R>
      : never
    : never
);

/*
type test = RecursiveTransformerUnion<unknown, never, never, []>;
type test2 = RecursiveTransformerUnion<unknown, never, never, [typeof number, typeof string]>;
*/

/*
function transformerUnion<S extends Transformer<WidestInput<S>, Output<S>>, T extends Transformer<WidestInput<T>, Output<T>>>(first: S, second: T): Transformer<WidestInput<S> & WidestInput<T>, Output<S> | Output<T>, NarrowestInput<S> | NarrowestInput<T>>;
function transformerUnion<I, O, E = I>(...transformers: Transformer<I, O, E>[]): Transformer<I, O, E>;
function transformerUnion<I, O, E = I>(...transformers: Transformer<I, O, E>[]): Transformer<I, O, E> {
*/
function transformerUnion<S extends [Function, ...Function[]]>(...transformers: S): Transformer<TransformerUnion<S>[0], TransformerUnion<S>[1], TransformerUnion<S>[2]> {
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

const frob = transformerUnion((x: string) => x);
const aoeu = transformerUnion((x: string) => x + "nice", (y: unknown) => 3);

/*
function chain<I, J, S extends Transformer<I, J>, T extends Transformer<J, Output<T>>>(first: S, second: T): Transformer<I, Output<T>, NarrowestInput<S>> {
  return (input) => second(first(input));
}
*/

/*
function chain<S extends TransformSpec, T extends Transformer<Output<S>, Output<T>>>(first: S, second: T): Transformer<WidestInput<S>, Output<T>, NarrowestInput<S>> {
  return (input) => second(transform(input, first));
}
*/

type TransformerChain2<S extends TransformSpec, T extends Function[]> = TransformerChain<[Transformer<WidestInput<S>, Output<S>, NarrowestInput<S>>, ...T]>;

// type epic = TransformerChain2<{hi: 7}, [(x: number) => string]>;

function chain<S extends TransformSpec, T extends Parameters<typeof transformerChain>>(spec: S, ...transformers: T): Transformer<TransformerChain2<S, T>[0], TransformerChain2<S, T>[1], TransformerChain2<S, T>[2]> {
  return (input) => {
    let result = transform(input, spec);
    for (const transformer of transformers) {
      result = transformer(input);
    }
    return result as any;
  }
  // return (input) => transformerChain(...transformers)(transform(input, spec));
}

/*
function transformerChain<S extends Transformer<WidestInput<S>, Output<S>>, T extends Transformer<Output<S>, Output<T>>>(first: S, second: T): Transformer<WidestInput<S>, Output<T>, NarrowestInput<S>> {
  return (input) => second(first(input));
}
*/

function transformerChain<S extends [Function, ...Function[]]>(...transformers: S): Transformer<TransformerChain<S>[0], TransformerChain<S>[1], TransformerChain<S>[2]> {
  return (input) => {
    for (const transformer of transformers) {
      input = transformer(input);
    }
    return input;
  }
}

const banana = transformerChain((x: string) => x + "hi", (y: number) => y + 3);

const fooSpec = {
  baz: union(string, number, optional(boolean)),
  test: union(number, string),
  rad: transformerUnion/*<unknown, number | string | boolean, number | string | boolean>*/(number, string, boolean),
  // brob: transformerUnion<string, number | Date>((x: string) => parseInt(x), (x: string) => new Date(x)),
};
const test: ObjectSpec = fooSpec;

type FooWide = WidestInput<typeof fooSpec>;
type FooNarrow = NarrowestInput<typeof fooSpec>;
type FooOutput = Output<typeof fooSpec>;

const linkedListSpec = {
  value: chain(number, (x: number) => x + 1, (y: number) => y + "hi"),
  baz: chain([number, number], transformerChain((([x, y]: [number, number]) => x + y), ((z: number) => z + 3))),
  next: placeholder,
}

linkedListSpec.next = optional(linkedListSpec);

type LinkedListInput = NarrowestInput<typeof linkedListSpec> & {
  readonly next?: LinkedListInput;
};

type LinkedListOutput = Output<typeof linkedListSpec> & {
  next?: LinkedListOutput;
}

const transformLinkedList = compile(linkedListSpec) as Transformer<unknown, LinkedListOutput, LinkedListInput>;

const thing: LinkedListInput = {
  value: 5,
  baz: [3, 9],
  next: {
    value: 7,
    baz: [2, 4],
  },
};

const numberValidationSpec = {
  min: optional(number),
  // max: optional(number),
  // integer: optional(boolean),
  real: boolean,
  foo: undefined,
  nice: remove,
  awesome: replaceWith(7),
  nested: placeholder,
};

numberValidationSpec.nested = optional(numberValidationSpec);

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
