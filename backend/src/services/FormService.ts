import { Form, FormDocument, FormModel } from "../models";

class FormService {
  async create(form: Form): Promise<FormDocument | null> {
    // TODO: check for duplicate identifiers
    return new FormModel(form).save();
  }

  async getByIdentifier(identifier: string): Promise<FormDocument | null> {
    return FormModel.findOne({ identifier });
  }
}

export default new FormService();
