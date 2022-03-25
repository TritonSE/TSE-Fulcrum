// https://stackoverflow.com/a/50375286
type UnionToIntersection<U> = (U extends any ? (u: U) => void : never) extends ((u: infer I) => void) ? I : never;

type AddOptionalIfMaybeUndefined<T> = UnionToIntersection<
  {
    [K in keyof T]: undefined extends T[K]
      ? {[key in K]?: T[K]}
      : {[key in K]: T[K]}
  }[keyof T]
>;

type ExcludeUndefined<T> = T extends undefined ? never : T;

// Cannot fully remove undefined from optional fields, unless
// --strictOptionalProperties is enabled
type StripUndefined<T> = UnionToIntersection<
  {
    [K in keyof T]: T[K] extends undefined
      ? {}
        : undefined extends T[K]
          ? {[key in K]?: T[K]}
          : {[key in K]: T[K]}
  }[keyof T]
>;

interface Aoeu {
  a: boolean;
  b: boolean | undefined;
  c: undefined;
}

type StripAoeu = StripUndefined<Aoeu>;

type Baz = Exclude<string | undefined, undefined>;

type ExcludeUndefinedFromValues<T> = {[K in keyof T]: Exclude<T[K], undefined>};

/*
type DeleteUndefinedFields<T> = UnionToIntersection<
  {
    [K in keyof T]
  }[keyof T]
>;
*/

type Primitive = bigint | boolean | number | null | string | symbol;

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

type TransformFunction<I, O, E = I> = (input: I) => O;

interface ObjectTransformSpec {
  // eslint-disable-next-line no-use-before-define
  readonly [key: string]: Primitive | TransformFunction<unknown, unknown> | TupleTransformSpec | ObjectTransformSpec | undefined;
}

type TransformSpec = Exclude<ObjectTransformSpec[string], undefined>;
type TupleTransformSpec = readonly [TransformSpec, ...TransformSpec[]] | readonly [];

type TransformInput<S> = (
  S extends TransformFunction<infer I, infer O, infer E>
    ? I & E
    : S extends Primitive
      ? S
      : S extends TupleTransformSpec
        ? {readonly [K in keyof S]: K extends keyof [] ? S[K] : TransformInput<S[K]>}
        : S extends ObjectTransformSpec
          ? StripUndefined<{readonly [K in keyof S]: TransformInput<S[K]>}>
          : never
);

type TransformOutput<S> = (
  S extends Primitive
    ? S
    : S extends TransformFunction<infer I, infer O, infer E>
      ? O
      : S extends TupleTransformSpec
        ? {-readonly [K in keyof S]: K extends keyof [] ? S[K] : TransformOutput<S[K]>}
        : S extends ObjectTransformSpec
          ? StripUndefined<{-readonly [K in keyof S]: TransformOutput<S[K]>}>
          // ? {-readonly [K in keyof S]: undefined extends TransformOutput<S[K]> ? never : TransformOutput<S[K]>} & {-readonly [K in keyof S]+?: undefined extends TransformOutput<S[K]> ? TransformOutput<S[K]> : never}
          : never
);

type foo = undefined extends (undefined | null) ? true : false;

function transformPrimitive<S extends Primitive>(input: unknown, spec: S): TransformOutput<S> {
  if (input === spec) {
    return input as TransformOutput<S>;
  }
  throw new Error("Values do not match");
}

function transformTuple<S extends TupleTransformSpec>(input: unknown, spec: S): TransformOutput<S> {
  if (!Array.isArray(input)) {
    throw new Error("Not an array");
  }
  if (input.length !== spec.length) {
    throw new Error("Wrong length");
  }

  // @ts-ignore
  const transformed = [] as TransformOutput<S>;
  for (let i = 0; i < spec.length; i++) {
    try {
      // @ts-ignore
      transformed.append(transform(input[i], spec[i]));
    } catch (e) {
      throw e;
    }
  }
  return transformed;
}

function transformObject<S extends ObjectTransformSpec>(input: unknown, spec: S): TransformOutput<S> {
  if (typeof input !== "object" || input === null) {
    throw new Error("Not an object");
  }

  // @ts-ignore
  const transformed = {} as TransformOutput<S>;
  for (const key of Object.getOwnPropertyNames(input)) {
    if (key in spec && spec[key] !== undefined) {
      // Field exists in input and spec.
      // @ts-ignore
      const value = transform(input[key], spec[key]);
      if (value !== undefined) {
        // @ts-ignore
        transformed[key] = value;
      }
    } else {
      // Field exists in input only.
      throw new Error("Extra key");
    }
  }
  for (const key of Object.getOwnPropertyNames(spec)) {
    if (!(key in input)) {
      // Field exists in spec only.
      // @ts-ignore
      const value = transform(undefined, spec[key]);
      if (value !== undefined) {
        // @ts-ignore
        transformed[key] = value;
      }
    }
  }
  return transformed;
}

function transform<S extends TransformSpec>(input: unknown, spec: S): TransformOutput<S> {
  if (isPrimitive(spec)) {
    return transformPrimitive(input, spec);
  }
  if (typeof spec === "function") {
    return spec(input) as TransformOutput<S>;
  }
  if (Array.isArray(spec)) {
    return transformTuple(input, spec as TupleTransformSpec) as TransformOutput<S>;
  }
  return transformObject(input, spec as ObjectTransformSpec) as TransformOutput<S>;
}


/*
function _boolean<I>(input: I) {
  if (typeof input === "boolean") {
    return input;
  }
  throw new Error();
}

const x = boolean("hi");
const y = boolean(false);

const boolean: TransformFunction<unknown, boolean, boolean> = _boolean;
*/

const boolean: TransformFunction<unknown, boolean, boolean> = (input) => {
  if (typeof input === "boolean") {
    return input;
  } else {
    throw new Error();
  }
}

const number: TransformFunction<unknown, number, number> = (input) => {
  if (typeof input === "number") {
    return input;
  }
  throw new Error();
}

const string: TransformFunction<unknown, string, string> = (input) => {
  if (typeof input === "string") {
    return input;
  }
  throw new Error();
}

function optional<S extends TransformSpec>(spec: S): TransformFunction<unknown, TransformOutput<S> | undefined, TransformInput<S> | undefined> {
  return (input) => {
    if (input === undefined) {
      return undefined;
    }
    return transform(input, spec);
  };
}

const numberValidationSpec = {
  min: optional(number),
  max: optional(number),
  integer: optional(boolean),
  real: boolean,
  foo: undefined,
};

type NumberValidationInput = TransformInput<typeof numberValidationSpec>;
type NumberValidationOutput = TransformOutput<typeof numberValidationSpec>;

type MinValidation = TransformOutput<typeof numberValidationSpec["min"]>;

type NumberValidation = TransformOutput<typeof numberValidationSpec>;
type bar = NumberValidation["min"];

type baz = TransformInput<typeof numberValidationSpec>;

type Test = {
  a: boolean;
  b: number | undefined;
}

// type UndefinedToOptional<T> = {[K in keyof T]: undefined extends T[K] ? {[key: K]: T[K]} : {[key: K]: T[K]}};
// type OptionalEntries<T> = {[K in keyof T]: undefined extends T[K] ? /*[true, K, T[K]]*/ {[key in K]: T[K]} : /*[false, K, T[K]]*/ {[key in K]: T[K]}}[keyof T];

// type Aoeu = AllowMissingIfUndefined<Test>;

// type Bar = Omit<Test, keyof Test>;

// type Stuff = { [K in keyof Test]: undefined extends Test[K] ? any : Test[K] } & { [K in keyof Test]+?: undefined extends Test[K] ? Test[K] : any };
// type Stuff = { [K in keyof Test]: undefined extends Test[K] ? any : Test[K] } & { [K in keyof Test]+?: undefined extends Test[K] ? Test[K] : any };

// const x: Stuff = { a: true };
// type AType = Stuff["a"];
// type BType = Stuff["b"];

function validatedNumber(options: NumberValidationInput): TransformFunction<unknown, number> {
  return (input) => {
    const num = number(input);
    if (options.min !== undefined && !(options.min <= num)) {
      throw new Error("Too large");
    }
    // TODO remaining conditions
    return num;
  };
}

const foo = validatedNumber({ max: 2 })(7);

export {
  number,
}
