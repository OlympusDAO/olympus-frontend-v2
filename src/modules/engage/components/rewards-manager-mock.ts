export type EpochStatus = "distributed" | "calculated" | "not_submitted" | "active";

export interface MockUser {
  address: string;
  drachmas: number;
  incentives: number;
  share: string;
  merkleLeaf: string;
}

export interface MockEpoch {
  id: number;
  number: number;
  status: EpochStatus;
  startTimestamp: number;
  endTimestamp: number;
  drachmasAccumulated: number;
  cdYieldGenerated: number;
  iOHMToDistribute: number;
  strikePrice: number;
  eligibleDate: string;
  expiryDate: string;
  users: MockUser[];
}

const ts = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);

const USERS_EP6: MockUser[] = [
  {
    address: "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
    drachmas: 12450,
    incentives: 312.5,
    share: "18.92%",
    merkleLeaf: "0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
  },
  {
    address: "0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c",
    drachmas: 9820,
    incentives: 245.5,
    share: "14.93%",
    merkleLeaf: "0xb2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3",
  },
  {
    address: "0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d",
    drachmas: 8100,
    incentives: 202.5,
    share: "12.31%",
    merkleLeaf: "0xc3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4",
  },
  {
    address: "0x4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e",
    drachmas: 6540,
    incentives: 163.5,
    share: "9.94%",
    merkleLeaf: "0xd4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5",
  },
  {
    address: "0x5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f",
    drachmas: 5200,
    incentives: 130.0,
    share: "7.90%",
    merkleLeaf: "0xe5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6",
  },
];

const makeUsers = (seed: number): MockUser[] =>
  USERS_EP6.map((u, i) => ({
    ...u,
    drachmas: Math.round(u.drachmas * (0.85 + seed * 0.03 + i * 0.01)),
    incentives: Math.round(u.incentives * (0.85 + seed * 0.03 + i * 0.01) * 10) / 10,
    share: `${((u.drachmas * (0.85 + seed * 0.03 + i * 0.01)) / 65000).toFixed(2)}%`,
  }));

export const MOCK_EPOCHS: MockEpoch[] = [
  {
    id: 6,
    number: 6,
    status: "distributed",
    startTimestamp: ts("2026-01-05T00:00:00Z"),
    endTimestamp: ts("2026-01-12T00:00:00Z"),
    drachmasAccumulated: 65800,
    cdYieldGenerated: 4820.5,
    iOHMToDistribute: 1645.0,
    strikePrice: 11.24,
    eligibleDate: "Jan 14, 2026",
    expiryDate: "Apr 14, 2026",
    users: makeUsers(0),
  },
  {
    id: 7,
    number: 7,
    status: "distributed",
    startTimestamp: ts("2026-01-12T00:00:00Z"),
    endTimestamp: ts("2026-01-19T00:00:00Z"),
    drachmasAccumulated: 68200,
    cdYieldGenerated: 5010.75,
    iOHMToDistribute: 1702.5,
    strikePrice: 11.31,
    eligibleDate: "Jan 21, 2026",
    expiryDate: "Apr 21, 2026",
    users: makeUsers(1),
  },
  {
    id: 8,
    number: 8,
    status: "distributed",
    startTimestamp: ts("2026-01-19T00:00:00Z"),
    endTimestamp: ts("2026-01-26T00:00:00Z"),
    drachmasAccumulated: 71500,
    cdYieldGenerated: 5240.0,
    iOHMToDistribute: 1785.0,
    strikePrice: 11.45,
    eligibleDate: "Jan 28, 2026",
    expiryDate: "Apr 28, 2026",
    users: makeUsers(2),
  },
  {
    id: 9,
    number: 9,
    status: "distributed",
    startTimestamp: ts("2026-01-26T00:00:00Z"),
    endTimestamp: ts("2026-02-02T00:00:00Z"),
    drachmasAccumulated: 73100,
    cdYieldGenerated: 5380.25,
    iOHMToDistribute: 1840.0,
    strikePrice: 11.52,
    eligibleDate: "Feb 04, 2026",
    expiryDate: "May 04, 2026",
    users: makeUsers(3),
  },
  {
    id: 10,
    number: 10,
    status: "distributed",
    startTimestamp: ts("2026-02-02T00:00:00Z"),
    endTimestamp: ts("2026-02-09T00:00:00Z"),
    drachmasAccumulated: 76400,
    cdYieldGenerated: 5610.5,
    iOHMToDistribute: 1912.5,
    strikePrice: 11.68,
    eligibleDate: "Feb 11, 2026",
    expiryDate: "May 11, 2026",
    users: makeUsers(4),
  },
  {
    id: 11,
    number: 11,
    status: "distributed",
    startTimestamp: ts("2026-02-09T00:00:00Z"),
    endTimestamp: ts("2026-02-16T00:00:00Z"),
    drachmasAccumulated: 79200,
    cdYieldGenerated: 5820.0,
    iOHMToDistribute: 1980.0,
    strikePrice: 11.74,
    eligibleDate: "Feb 18, 2026",
    expiryDate: "May 18, 2026",
    users: makeUsers(5),
  },
  {
    id: 12,
    number: 12,
    status: "distributed",
    startTimestamp: ts("2026-02-16T00:00:00Z"),
    endTimestamp: ts("2026-02-23T00:00:00Z"),
    drachmasAccumulated: 82100,
    cdYieldGenerated: 6030.75,
    iOHMToDistribute: 2052.5,
    strikePrice: 11.89,
    eligibleDate: "Feb 25, 2026",
    expiryDate: "May 25, 2026",
    users: makeUsers(6),
  },
  {
    id: 13,
    number: 13,
    status: "calculated",
    startTimestamp: ts("2026-02-23T00:00:00Z"),
    endTimestamp: ts("2026-03-02T00:00:00Z"),
    drachmasAccumulated: 84750,
    cdYieldGenerated: 6240.0,
    iOHMToDistribute: 2118.75,
    strikePrice: 12.05,
    eligibleDate: "Mar 04, 2026",
    expiryDate: "Jun 04, 2026",
    users: makeUsers(7),
  },
  {
    id: 14,
    number: 14,
    status: "not_submitted",
    startTimestamp: ts("2026-03-02T00:00:00Z"),
    endTimestamp: ts("2026-03-09T00:00:00Z"),
    drachmasAccumulated: 87300,
    cdYieldGenerated: 6415.5,
    iOHMToDistribute: 2182.5,
    strikePrice: 12.18,
    eligibleDate: "Mar 11, 2026",
    expiryDate: "Jun 11, 2026",
    users: makeUsers(8),
  },
  {
    id: 15,
    number: 15,
    status: "active",
    startTimestamp: ts("2026-03-09T00:00:00Z"),
    endTimestamp: ts("2026-03-16T00:00:00Z"),
    drachmasAccumulated: 31200,
    cdYieldGenerated: 2290.0,
    iOHMToDistribute: 0,
    strikePrice: 0,
    eligibleDate: "—",
    expiryDate: "—",
    users: [],
  },
];
