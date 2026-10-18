export type MonthlyRow = {
  key: string;
  label: string;
  issued: number;
  revoked: number;
};

export type ClubIssuedRow = {
  id: string;
  name: string;
  issued: number;
};

function BarPair({
  issued,
  revoked,
  max,
  label,
  showRevoked = true,
}: {
  issued: number;
  revoked: number;
  max: number;
  label: string;
  showRevoked?: boolean;
}) {
  const issuedPct = max === 0 ? 0 : Math.round((issued / max) * 100);
  const revokedPct = max === 0 ? 0 : Math.round((revoked / max) * 100);
  return (
    <div className="grid grid-cols-[5.5rem_1fr] items-center gap-3">
      <p className="truncate text-xs text-muted-foreground">{label}</p>
      <div className="space-y-1">
        <div
          className="h-2 rounded-full bg-success"
          style={{ width: `${issuedPct}%`, minWidth: issued > 0 ? "0.35rem" : 0 }}
          title={`${issued} issued`}
        />
        {showRevoked && (
          <div
            className="h-2 rounded-full bg-danger/70"
            style={{
              width: `${revokedPct}%`,
              minWidth: revoked > 0 ? "0.35rem" : 0,
            }}
            title={`${revoked} revoked`}
          />
        )}
      </div>
    </div>
  );
}

export function DistrictCharts({
  monthlyRows,
  perClub,
}: {
  monthlyRows: MonthlyRow[];
  perClub: ClubIssuedRow[];
}) {
  const monthMax = Math.max(
    1,
    ...monthlyRows.map((row) => Math.max(row.issued, row.revoked)),
  );
  const clubMax = Math.max(1, ...perClub.map((row) => row.issued));
  const hasMonthData = monthlyRows.some(
    (row) => row.issued > 0 || row.revoked > 0,
  );
  const hasClubData = perClub.some((row) => row.issued > 0);

  if (!hasMonthData && !hasClubData) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {hasMonthData && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Issued vs revoked</p>
            <p className="text-xs text-muted-foreground">
              <span className="mr-2 inline-block h-2 w-2 rounded-full bg-success" />
              Issued
              <span className="ml-3 mr-2 inline-block h-2 w-2 rounded-full bg-danger/70" />
              Revoked
            </p>
          </div>
          <div className="space-y-2.5">
            {[...monthlyRows].reverse().map((row) => (
              <BarPair
                key={row.key}
                label={row.label}
                issued={row.issued}
                revoked={row.revoked}
                max={monthMax}
              />
            ))}
          </div>
        </div>
      )}
      {hasClubData && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Issued by club</p>
          <div className="space-y-2.5">
            {perClub.map((row) => (
              <BarPair
                key={row.id}
                label={row.name}
                issued={row.issued}
                revoked={0}
                max={clubMax}
                showRevoked={false}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
