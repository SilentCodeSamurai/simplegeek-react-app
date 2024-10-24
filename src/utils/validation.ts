import { ZodError, ZodSchema, z } from "zod";

export const validateData = <T extends ZodSchema>(schema: T, data: unknown): z.infer<T> => {
	try {
		return schema.parse(data);
	} catch (error) {
		if (error instanceof ZodError) {
			console.error("Validation error", { schema: schema.description, issues: error.issues });
		}
		return
	}
};
