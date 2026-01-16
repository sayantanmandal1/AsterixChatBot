CREATE TABLE IF NOT EXISTS "CreditBalance" (
	"userId" uuid PRIMARY KEY NOT NULL,
	"balance" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"lastMonthlyAllocation" timestamp,
	"isNewUser" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "CreditTransaction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"balanceAfter" numeric(10, 2) NOT NULL,
	"description" text,
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "GuestSession" (
	"sessionId" varchar(255) PRIMARY KEY NOT NULL,
	"balance" numeric(10, 2) DEFAULT '200.00' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"expiresAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "SubscriptionPlan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"credits" numeric(10, 2) NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"description" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"displayOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "UserPurchase" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"planId" uuid NOT NULL,
	"creditsAdded" numeric(10, 2) NOT NULL,
	"amountPaid" numeric(10, 2) NOT NULL,
	"status" varchar(20) DEFAULT 'completed' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "CreditBalance" ADD CONSTRAINT "CreditBalance_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "UserPurchase" ADD CONSTRAINT "UserPurchase_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "UserPurchase" ADD CONSTRAINT "UserPurchase_planId_SubscriptionPlan_id_fk" FOREIGN KEY ("planId") REFERENCES "public"."SubscriptionPlan"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "creditBalance_userId_idx" ON "CreditBalance" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "creditTransaction_userId_idx" ON "CreditTransaction" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "creditTransaction_createdAt_idx" ON "CreditTransaction" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "creditTransaction_userId_createdAt_idx" ON "CreditTransaction" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "userPurchase_userId_idx" ON "UserPurchase" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "userPurchase_createdAt_idx" ON "UserPurchase" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "userPurchase_userId_createdAt_idx" ON "UserPurchase" USING btree ("userId","createdAt");