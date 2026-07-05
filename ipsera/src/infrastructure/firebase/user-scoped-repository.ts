import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import type { BaseEntity } from "@/domain/types/common";
import { db } from "./client";
import { fromFirestoreData, toFirestoreData } from "./converters";

/**
 * Every IPSERA collection (tasks, projects, goals, reflections) lives at
 * users/{uid}/{collection}/{docId} and shares the same CRUD + realtime
 * subscription shape, so it's factored out once here instead of copy-pasted
 * per entity.
 */
export function createUserScopedRepository<TEntity extends BaseEntity>(
  collectionName: string
) {
  const collectionPath = (uid: string) => `users/${uid}/${collectionName}`;

  function subscribe(
    uid: string,
    onChange: (items: TEntity[]) => void,
    onError?: (error: Error) => void
  ) {
    const q = query(
      collection(db, collectionPath(uid)),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(
      q,
      (snapshot) => {
        onChange(
          snapshot.docs.map((docSnap) =>
            fromFirestoreData<TEntity>(docSnap.id, uid, docSnap.data())
          )
        );
      },
      onError
    );
  }

  async function create(
    uid: string,
    data: Record<string, unknown>
  ): Promise<string> {
    const ref = await addDoc(collection(db, collectionPath(uid)), {
      ...toFirestoreData(data),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  }

  async function update(
    uid: string,
    id: string,
    data: Record<string, unknown>
  ): Promise<void> {
    await updateDoc(doc(db, collectionPath(uid), id), {
      ...toFirestoreData(data),
      updatedAt: serverTimestamp(),
    });
  }

  async function remove(uid: string, id: string): Promise<void> {
    await deleteDoc(doc(db, collectionPath(uid), id));
  }

  return { subscribe, create, update, remove };
}
