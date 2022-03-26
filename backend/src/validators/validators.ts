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

function reprPrimitive(value: Primitive): string {
  switch (typeof value) {
    case "bigint":
      return value.toString() + "n";
    case "string":
      return JSON.stringify(value);
    case "symbol":
      return value.toString();
    default:
      return "" + value;
  }
}


/*
paths
error messages at leaves
step of the union/chain?
*/

type Transformer<I, O, E = I> = (input: I) => O;

type TransformSpec = Primitive | Transformer<unknown, unknown> | TupleSpec | ObjectSpec;

interface ObjectSpec {
  readonly [key: string]: TransformSpec;
}

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
  throw new Error(`Not equal to ${reprPrimitive(spec)}`);
}

function transformTuple<S extends TupleSpec>(input: WidestInput<S>, spec: S): Output<S> {
  if (!Array.isArray(input)) {
    throw new Error("Not an array");
  }
  if (input.length !== spec.length) {
    throw new Error(`Length is not ${spec.length}`);
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
      throw new Error(`Unrecognized key: ${reprPrimitive(key)}`);
    }
  }

  const transformed = {} as Output<S>;
  for (const key of Object.getOwnPropertyNames(spec)) {
    const inputValue: unknown = (input as any)[key];
    try {
      const transformedValue = transform(inputValue, spec[key]);
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

interface OneTransformError {
  error: string;
}

interface ManyTransformErrors {
  errors: string[];
}

interface NestedTransformErrors {
  fields: {
    [key: string]: OneTransformError | ManyTransformErrors | NestedTransformErrors;
  };
}


/*
{
  hi: number,
  bye: number,
  razzle: [string, string],
  baz: validateNumber({ min: 3, integer: true }),
}
{
  type: "object",
  fields: {
    hi: {
      type: "function",
      name: "number"
    },
    bye: {
      type: "function",
      name: "string"
    },
    razzle: {
      type: "array",
      elements: [
        {
          type: "function",
          name: "string"
        },
        {
          type: "function",
          name: "string"
        },
      ]
    },
    baz: {
      type: "call",
      function: "validateNumber",
      arguments: [
        {
          type: "object",
          fields: {
            min: {
              type: "number",
              value: 3,
            },
            integer: {
              type: "boolean",
              value: true,
            }
          }
        }
      ]
    }
  },
}
{
  hi: "number",
  bye: "number",
  razzle: ["tuple", ["list", "string", "string"]],
  baz: ["validateNumber", { min: 3, integer: true }]
}
{
  hi: 3,
  bye: "there",
  razzle: ["oops", 7],
  baz: 2.5,
  huh: "extra",
}
{
  fields: {
    bye: {
      "error": "Not a number"
    },
    razzle: {
      fields: {
        "1": {
          "error": "Not a string"
        }
      }
    },
    baz: {
      "errors": ["Less than the minimum of 3", "Not an integer"]
    }
    huh: {
      "error": "Unrecognized key"
    }
  }
}
*/

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
    throw new Error("Not a boolean");
  }
}

const number: Transformer<unknown, number, number> = (input) => {
  if (typeof input === "number") {
    return input;
  }
  throw new Error("Not a number");
}

const string: Transformer<unknown, string, string> = (input) => {
  if (typeof input === "string") {
    return input;
  }
  throw new Error("Not a string");
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

function transformerChain<S extends [Function, ...Function[]]>(...transformers: S): Transformer<TransformerChain<S>[0], TransformerChain<S>[1], TransformerChain<S>[2]> {
  return (input) => {
    for (const transformer of transformers) {
      input = transformer(input);
    }
    return input;
  }
}

type Chain<S extends TransformSpec, T extends Function[]> = TransformerChain<[Transformer<WidestInput<S>, Output<S>, NarrowestInput<S>>, ...T]>;

function chain<S extends TransformSpec, T extends Parameters<typeof transformerChain>>(spec: S, ...transformers: T): Transformer<Chain<S, T>[0], Chain<S, T>[1], Chain<S, T>[2]> {
  return (input) => {
    let result = transform(input, spec);
    for (const transformer of transformers) {
      result = transformer(input);
    }
    return result as any;
  }
}

function arrayOf<S extends TransformSpec>(spec: S): Transformer<unknown, Output<S>[], NarrowestInput<S>[]> {
  return (input) => {
    if (!Array.isArray(input)) {
      throw new Error("Not an array");
    }
    const transformed = [];
    for (let i = 0; i < input.length; i++) {
      try {
        transformed.push(transform(input[i], spec));
      } catch (e) {
        throw e;
      }
    }
    return transformed;
  }
}

// type PartialSpec<S> = { [K in keyof S]: Transformer<unknown, Output<S[K]> | undefined, NarrowestInput<S[K]> | undefined> };
type PartialSpec<S> = { [K in keyof S]: Transformer<unknown, Output<S[K]> | undefined, NarrowestInput<S[K]> | undefined> };

function partial<S extends ObjectSpec>(spec: S): PartialSpec<S> {
  const result = {} as PartialSpec<S>;
  for (const k of Object.getOwnPropertyNames(spec)) {
    const key: keyof S = k;
    const valueSpec = spec[key];
    if (valueSpec !== undefined) {
      result[key] = optional(valueSpec) as PartialSpec<S>[keyof S];
    }
  }
  return result as PartialSpec<S>;
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
  nice: remove,
  awesome: replaceWith(7),
  nested: placeholder,
};

const partialNumberValidationSpec = partial(numberValidationSpec);

type bazn = typeof partialNumberValidationSpec;

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
  boolean,
  number,
  string,
  transform,
  union,
  chain,
  compile,
  remove,
  replaceWith,
  placeholder,
  Transformer,
  TransformSpec,
  Output,
  WidestInput,
  NarrowestInput,
}
