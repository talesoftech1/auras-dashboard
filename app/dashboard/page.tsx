import Link from "next/link";
import { requireBot } from "@/lib/bot";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function DashboardHome() {
  const { bot: primary } = await requireBot();

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">{primary.company_name}</h1>
        <p className="text-muted-foreground">
          Trigger keyword: <span className="font-mono">{primary.trigger_keyword}</span>
          {" · "}
          Status:{" "}
          <span className="capitalize">
            {primary.status ?? "pending"}
          </span>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Conversations (7d)" value="—" />
        <Stat label="Unanswered" value="—" />
        <Stat label="Documents" value="—" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Next steps</CardTitle>
          <CardDescription>
            Set up your bot so it answers customers well.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/dashboard/knowledge" className="underline underline-offset-4">
                Upload a price list or FAQ document
              </Link>
            </li>
            <li>
              <Link href="/dashboard/settings" className="underline underline-offset-4">
                Review the system prompt &amp; tone
              </Link>
            </li>
            <li>
              <Link href="/dashboard/unanswered" className="underline underline-offset-4">
                Check the unanswered queue
              </Link>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}
