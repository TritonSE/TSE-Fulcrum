import { HydratedDocument, model, Schema } from "mongoose";

interface FormField {
  type: "string" | "number" | "boolean";
  choices: unknown[];
  allowOther: boolean;
  displayName: string;
  displaySize: number;
}

interface Form {
  identifier: string;
  fields: Record<string, FormField>;
  displayName: string;
  displayOrder: string[];
}

const FormFieldSchema = new Schema<FormField>({
  type: {
    type: String,
    enum: ["string", "number", "boolean"],
    required: true,
  },
  choices: {
    type: Array,
    required: true,
  },
  allowOther: {
    type: Boolean,
    required: true,
  },
  displayName: {
    type: String,
    required: true,
  },
  displaySize: {
    type: Number,
    required: true,
  },
});

const FormSchema = new Schema<Form>({
  identifier: {
    type: String,
    required: true,
    unique: true,
    immutable: true,
  },
  fields: {
    type: Map,
    of: FormFieldSchema,
    required: true,
  },
  displayName: {
    type: String,
    required: true,
  },
  displayOrder: {
    type: [String],
    required: true,
  },
});

const FormModel = model("Form", FormSchema);
type FormDocument = HydratedDocument<Form>;

export { Form, FormModel, FormDocument };
