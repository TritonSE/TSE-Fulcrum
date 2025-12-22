import readlineSync from "readline-sync";

export const promptConfirmation = (message: string): boolean => {
  const response = readlineSync.question(message);
  if (response !== "y") {
    return false;
  }

  return true;
};
