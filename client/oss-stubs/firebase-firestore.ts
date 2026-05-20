// OSS stub for `firebase/firestore`. See firebase-app.ts for the rationale.
/* eslint-disable @typescript-eslint/no-explicit-any */

const unreachable = (name: string): never => {
    throw new Error(`firebase/firestore.${name}() is not available in OSS builds`);
};

export type Firestore = any;
export type DocumentReference = any;
export type CollectionReference = any;
export type QueryDocumentSnapshot = {id: string; data(): any};
export type QuerySnapshot = {
    docs: QueryDocumentSnapshot[];
    empty: boolean;
    forEach(cb: (doc: QueryDocumentSnapshot) => void): void;
};
export type DocumentSnapshot = {id?: string; exists(): boolean; data(): any};
export type Query = any;
export type QueryConstraint = any;
export type FieldValue = any;
export type WhereFilterOp = string;

export const getFirestore = (..._args: any[]): Firestore => null;
export const doc = (..._args: any[]): DocumentReference => unreachable("doc");
export const collection = (..._args: any[]): CollectionReference => unreachable("collection");
export const getDoc = async (..._args: any[]): Promise<DocumentSnapshot> => unreachable("getDoc");
export const getDocs = async (..._args: any[]): Promise<QuerySnapshot> => unreachable("getDocs");
export const setDoc = async (..._args: any[]): Promise<void> => unreachable("setDoc");
export const updateDoc = async (..._args: any[]): Promise<void> => unreachable("updateDoc");
export const deleteDoc = async (..._args: any[]): Promise<void> => unreachable("deleteDoc");
export const query = (..._args: any[]): Query => unreachable("query");
export const where = (..._args: any[]): QueryConstraint => unreachable("where");
export const orderBy = (..._args: any[]): QueryConstraint => unreachable("orderBy");
export const limit = (..._args: any[]): QueryConstraint => unreachable("limit");
export const serverTimestamp = (..._args: any[]): FieldValue => unreachable("serverTimestamp");
export const onSnapshot = (..._args: any[]): (() => void) => () => {/* no-op unsubscribe */};
