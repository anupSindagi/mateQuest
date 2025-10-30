import { Account, Client, Databases } from 'appwrite';

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT as string | undefined;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT as string | undefined;

let client: Client | null = null;
let account: Account | null = null;
let databases: Databases | null = null;

export function getAppwriteAccount(): Account {
  if (account) return account;

  if (!endpoint || !projectId) {
    throw new Error('Missing Appwrite config. Set NEXT_PUBLIC_APPWRITE_ENDPOINT and NEXT_PUBLIC_APPWRITE_PROJECT');
  }

  client = new Client().setEndpoint(endpoint).setProject(projectId);
  account = new Account(client);
  return account;
}

export type AppwriteUser = {
  $id: string;
  email?: string;
  name?: string;
};

export function getAppwriteDatabases(): Databases {
  if (databases) return databases;
  if (!endpoint || !projectId) {
    throw new Error('Missing Appwrite config. Set NEXT_PUBLIC_APPWRITE_ENDPOINT and NEXT_PUBLIC_APPWRITE_PROJECT');
  }
  if (!client) {
    client = new Client().setEndpoint(endpoint).setProject(projectId);
  }
  databases = new Databases(client);
  return databases;
}


