import { AsyncLocalStorage } from "node:async_hooks";

export const asyncLocalStorage = new AsyncLocalStorage();

export type ApplicationLocalStorage = {
  deploymentUrl: string;
};

export const retrieveDeploymentUrl = () => {
  const store = asyncLocalStorage.getStore() as ApplicationLocalStorage;
  return store?.deploymentUrl;
};
