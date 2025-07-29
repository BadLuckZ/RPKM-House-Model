export type HouseType = {
  id: string;
  housename: string;
  sizename: string;
  capacity: number;
};

export type GroupType = {
  id: string;
  owner_id: string;
  member_id_1: string | null;
  member_id_2: string | null;
  member_count: number;
  house_rank_1: string | null;
  house_rank_2: string | null;
  house_rank_3: string | null;
  house_rank_4: string | null;
  house_rank_5: string | null;
  house_rank_sub: string | null;
};
