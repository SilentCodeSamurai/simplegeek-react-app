import { z } from "zod";

export const IdSchema = z.string().uuid() 

export const ISOToDateSchema = z.string().datetime().pipe( z.coerce.date() );
