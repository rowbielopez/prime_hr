"use client";

import { useCallback, useSyncExternalStore } from "react";

type Listener = () => void;

const listenersByKey = new Map<string, Set<Listener>>();

function getListeners(key: string): Set<Listener> {
    let set = listenersByKey.get(key);
    if (!set) {
        set = new Set();
        listenersByKey.set(key, set);
    }
    return set;
}

function notify(key: string) {
    const set = listenersByKey.get(key);
    if (!set) return;
    for (const l of set) l();
}

function subscribe(key: string, listener: Listener) {
    const set = getListeners(key);
    set.add(listener);
    const onStorage = (event: StorageEvent) => {
        if (event.key === key) listener();
    };
    window.addEventListener("storage", onStorage);
    return () => {
        set.delete(listener);
        window.removeEventListener("storage", onStorage);
    };
}

function readRaw(key: string): string | null {
    try {
        return window.localStorage.getItem(key);
    } catch {
        return null;
    }
}

function writeRaw(key: string, value: string) {
    try {
        window.localStorage.setItem(key, value);
    } catch {
        // Ignore.
    }
}

/**
 * SSR-safe localStorage hook backed by `useSyncExternalStore`.
 *
 * - Returns `initialValue` on the server and during the first client render
 *   (hydration-safe); rehydrates from storage immediately on mount.
 * - Cross-tab updates flow through the native `storage` event.
 * - Same-tab updates between hook instances flow through an in-module pub/sub.
 *
 * The setter accepts the same `value | (prev) => next` signature as
 * `useState`.
 */
export function useLocalStorage<T>(
    key: string,
    initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
    const getSnapshot = useCallback(() => readRaw(key), [key]);
    const getServerSnapshot = useCallback(() => null, []);
    const subscribeKey = useCallback(
        (listener: Listener) => subscribe(key, listener),
        [key],
    );

    const raw = useSyncExternalStore(subscribeKey, getSnapshot, getServerSnapshot);

    let parsed: T = initialValue;
    if (raw != null) {
        try {
            parsed = JSON.parse(raw) as T;
        } catch {
            parsed = initialValue;
        }
    }

    const setValue = useCallback(
        (value: T | ((prev: T) => T)) => {
            const current = (() => {
                const r = readRaw(key);
                if (r == null) return initialValue;
                try {
                    return JSON.parse(r) as T;
                } catch {
                    return initialValue;
                }
            })();
            const next =
                typeof value === "function" ? (value as (p: T) => T)(current) : value;
            writeRaw(key, JSON.stringify(next));
            notify(key);
        },
        [key, initialValue],
    );

    return [parsed, setValue];
}
