import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { AwsClient } from "aws4fetch";

import {
	R2_BUCKET_NAMES,
	R2_SIGNED_URL_TTL_SECONDS,
	R2AccessError,
	answerKeyObjectKey,
	assetObjectKey,
	audioObjectKey,
	authorizeSignedDownload,
	contentObjectKey,
	parseR2ObjectKey,
	transcriptObjectKey,
} from "./r2-keys.ts";
import type { AttemptObjectAccess } from "./r2-keys.ts";

export {
	R2_SIGNED_URL_TTL_SECONDS,
	R2AccessError,
	answerKeyObjectKey,
	assetObjectKey,
	audioObjectKey,
	contentObjectKey,
	transcriptObjectKey,
};
export type { AttemptObjectAccess, R2ObjectKind, R2ObjectReference } from "./r2-keys.ts";

/** Credentials for Cloudflare's S3-compatible R2 presigning endpoint. */
export type R2SigningCredentials = {
	accountId: string;
	accessKeyId: string;
	secretAccessKey: string;
};

function required(name: "CLOUDFLARE_ACCOUNT_ID" | "R2_ACCESS_KEY_ID" | "R2_SECRET_ACCESS_KEY"): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`${name} is not set. Add it to .dev.vars locally, or configure it for the Worker.`);
	}
	return value;
}

/** Reads the R2 presigning configuration without exposing any value. */
export function r2SigningCredentials(): R2SigningCredentials {
	return {
		accountId: required("CLOUDFLARE_ACCOUNT_ID"),
		accessKeyId: required("R2_ACCESS_KEY_ID"),
		secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
	};
}

const encodeKey = (key: string) => key.split("/").map(encodeURIComponent).join("/");

/**
 * Signs an authorised R2 GET for exactly five minutes.
 *
 * The policy check runs before credentials are read: `key.json` and
 * `content.json` remain un-signable even in a misconfigured environment.
 * Callers must resolve `access` from the server-side attempt and assignment,
 * never from client-provided claims.
 */
export async function signUrl(
	key: string,
	access?: AttemptObjectAccess,
	credentials?: R2SigningCredentials,
): Promise<string> {
	const object = authorizeSignedDownload(key, access);
	const resolved = credentials ?? r2SigningCredentials();
	if (!/^[0-9a-f]{32}$/i.test(resolved.accountId)) throw new R2AccessError("Cloudflare account id is malformed");

	const endpoint = new URL(
		`https://${resolved.accountId}.r2.cloudflarestorage.com/${R2_BUCKET_NAMES[object.bucket]}/${encodeKey(object.key)}`,
	);
	endpoint.searchParams.set("X-Amz-Expires", String(R2_SIGNED_URL_TTL_SECONDS));
	const client = new AwsClient({
		accessKeyId: resolved.accessKeyId,
		secretAccessKey: resolved.secretAccessKey,
		service: "s3",
		region: "auto",
	});
	const request = await client.sign(new Request(endpoint, { method: "GET" }), {
		aws: { signQuery: true },
	});
	return request.url;
}

async function readExpectedObject(key: string, expected: "content" | "answer_key"): Promise<R2ObjectBody | null> {
	const object = parseR2ObjectKey(key);
	if (object.kind !== expected) throw new R2AccessError(`Expected ${expected}, received ${object.kind}`);
	return getCloudflareContext().env.CONTENT_BUCKET.get(object.key);
}

/** Reads `content.json` privately through the Worker binding; it never creates a URL. */
export function readContentObject(key: string): Promise<R2ObjectBody | null> {
	return readExpectedObject(key, "content");
}

/** Reads `key.json` privately through the Worker binding; it never creates a URL. */
export function readAnswerKeyObject(key: string): Promise<R2ObjectBody | null> {
	return readExpectedObject(key, "answer_key");
}
