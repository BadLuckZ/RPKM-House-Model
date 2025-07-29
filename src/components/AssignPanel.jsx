import { useEffect, useState } from "react";
import { assignGroupsVa, assignGroupsVb } from "../lib/api";
import * as XLSX from "xlsx";
import { FIXED_GROUPS, FIXED_HOUSES } from "../utils/const";
import { shuffle } from "../utils/function";
import {
  buttonStyle,
  headerStyle,
  secondaryButtonStyle,
  thTdStyle,
  tableStyle,
} from "../style/style";

// Function สำหรับสุ่มการเลือกบ้านของแต่ละ Group (ใช้ในกรณีที่ FIXED_GROUPS = [])
function generateRandomGroups(numGroups, housesObj) {
  const housesBySize = {
    S: [],
    M: [],
    L: [],
    XL: [],
    XXL: [],
  };

  Object.entries(housesObj).forEach(([id, house]) => {
    housesBySize[house.sizename].push(id);
  });

  const headIds = shuffle(
    Array.from({ length: numGroups }, (_, i) => 20000 + i + 1)
  );

  const usedMemberIds = new Set();
  const groups = [];
  let nextMemberId = 30001;

  // กำหนดน้ำหนักสำหรับจำนวนคนในกลุ่ม
  const numPeopleWeightsBox = [0.6, 0.2, 0.2];
  const numPeopleWeights = {
    1: numPeopleWeightsBox[0],
    2: numPeopleWeightsBox[1],
    3: numPeopleWeightsBox[2],
  };

  for (let gid = 0; gid < numGroups; gid++) {
    let member_count;
    const rand = Math.random();
    if (rand < numPeopleWeights[1]) {
      member_count = 1;
    } else if (rand < numPeopleWeights[1] + numPeopleWeights[2]) {
      member_count = 2;
    } else {
      member_count = 3;
    }

    const owner_id = headIds[gid];

    let member_id_1 = null,
      member_id_2 = null;
    if (member_count > 1) {
      while (usedMemberIds.has(nextMemberId) || nextMemberId === owner_id)
        nextMemberId++;
      member_id_1 = nextMemberId;
      usedMemberIds.add(member_id_1);
      nextMemberId++;
    }
    if (member_count > 2) {
      while (
        usedMemberIds.has(nextMemberId) ||
        nextMemberId === owner_id ||
        nextMemberId === member_id_1
      )
        nextMemberId++;
      member_id_2 = nextMemberId;
      usedMemberIds.add(member_id_2);
      nextMemberId++;
    }

    // สร้าง preference ให้กับ Size
    const sizeWeightsBox = [0.3, 0.25, 0.25, 0.1, 0.1];
    const sizeWeights = {
      S: sizeWeightsBox[0],
      M: sizeWeightsBox[1],
      L: sizeWeightsBox[2],
      XL: sizeWeightsBox[3],
      XXL: sizeWeightsBox[4],
    };

    // สร้าง preference ให้กับบ้าน S (มี 8 บ้าน)
    const SWeightsBox = [0.25, 0.05, 0.25, 0.05, 0.25, 0.05, 0.05, 0.05];
    const SWeights = {
      บ้านว้อนท์: SWeightsBox[0],
      บ้านดัง: SWeightsBox[1],
      บ้านโบ้: SWeightsBox[2],
      บ้านคุณหนู: SWeightsBox[3],
      บ้านเดอะ: SWeightsBox[4],
      บ้านหลายใจ: SWeightsBox[5],
      บ้านอากาเป้: SWeightsBox[6],
      บ้านโคะ: SWeightsBox[7],
    };

    // สร้าง preference ให้กับบ้าน M (มี 5 บ้าน)
    const MWeightsBox = [0.425, 0.05, 0.05, 0.05, 0.425];
    const MWeights = {
      บ้านอะอึ๋ม: MWeightsBox[0],
      บ้านจิ๊จ๊ะ: MWeightsBox[1],
      บ้านนอก: MWeightsBox[2],
      บ้านเอช้วน: MWeightsBox[3],
      บ้านคิดส์: MWeightsBox[4],
    };

    // สร้าง preference ให้กับบ้าน L (มี 4 บ้าน)
    const LWeightsBox = [0.45, 0.05, 0.05, 0.45];
    const LWeights = {
      บ้านแจ๋ว: LWeightsBox[0],
      บ้านสด: LWeightsBox[1],
      "บ้านโจ๊ะเด๊ะ ฮือซา": LWeightsBox[2],
      บ้านเฮา: LWeightsBox[3],
    };

    // สร้าง preference ให้กับบ้าน XL (มี 3 บ้าน)
    const XLWeightsBox = [0.05, 0.05, 0.8];
    const XLWeights = {
      บ้านคุ้ม: XLWeightsBox[0],
      บ้านโจ๋: XLWeightsBox[1],
      บ้านโซ้ยตี๋หลีหมวย: XLWeightsBox[2],
    };

    // สร้าง preference ให้กับบ้าน XXL (มี 2 บ้าน)
    const XXLWeightsBox = [0.95, 0.05];
    const XXLWeights = {
      บ้านแรงส์: XXLWeightsBox[0],
      บ้านยิ้ม: XXLWeightsBox[1],
    };

    // สร้าง preference ให้กับบ้านที่เป็นสำรอง (มีแค่ XL และ XXL: 5 บ้าน)
    const subPrefWeightsBox = [0.05, 0.425, 0.05, 0.425, 0.05];
    const subPrefWeights = {
      บ้านโจ๋: subPrefWeightsBox[0],
      บ้านคุ้ม: subPrefWeightsBox[1],
      บ้านแรงส์: subPrefWeightsBox[2],
      บ้านยิ้ม: subPrefWeightsBox[3],
      บ้านโซ้ยตี๋หลีหมวย: subPrefWeightsBox[4],
    };

    const getRandomHouseByWeight = (excludeIds = []) => {
      const availableHouses = {
        S: housesBySize.S.filter((id) => !excludeIds.includes(id)),
        M: housesBySize.M.filter((id) => !excludeIds.includes(id)),
        L: housesBySize.L.filter((id) => !excludeIds.includes(id)),
        XL: housesBySize.XL.filter((id) => !excludeIds.includes(id)),
        XXL: housesBySize.XXL.filter((id) => !excludeIds.includes(id)),
      };

      // คำนวณน้ำหนักใหม่สำหรับไซส์ที่ยังมีบ้านเหลือ
      const availableSizes = Object.keys(availableHouses).filter(
        (size) => availableHouses[size].length > 0
      );

      if (availableSizes.length === 0) return null;

      const totalWeight = availableSizes.reduce(
        (sum, size) => sum + sizeWeights[size],
        0
      );
      let random = Math.random() * totalWeight;

      for (const size of availableSizes) {
        random -= sizeWeights[size];
        if (random <= 0) {
          const houses = availableHouses[size];
          return houses[Math.floor(Math.random() * houses.length)];
        }
      }

      // fallback
      const fallbackSize = availableSizes[0];
      const houses = availableHouses[fallbackSize];
      return houses[Math.floor(Math.random() * houses.length)];
    };

    const pickWeightedHouse = (size, excludeIds = []) => {
      let weightsObj, houseIds;
      if (size === "S") {
        weightsObj = SWeights;
        houseIds = housesBySize.S.filter((id) => !excludeIds.includes(id));
      } else if (size === "M") {
        weightsObj = MWeights;
        houseIds = housesBySize.M.filter((id) => !excludeIds.includes(id));
      } else if (size === "L") {
        weightsObj = LWeights;
        houseIds = housesBySize.L.filter((id) => !excludeIds.includes(id));
      } else if (size === "XL") {
        weightsObj = XLWeights;
        houseIds = housesBySize.XL.filter((id) => !excludeIds.includes(id));
      } else if (size === "XXL") {
        weightsObj = XXLWeights;
        houseIds = housesBySize.XXL.filter((id) => !excludeIds.includes(id));
      } else {
        return null;
      }
      if (houseIds.length === 0) return null;
      const weightsArr = houseIds.map((id) => {
        const houseName = housesObj[id]?.housename;
        return weightsObj[houseName] ?? 0.05;
      });
      const totalWeight = weightsArr.reduce((a, b) => a + b, 0);
      let rnd = Math.random() * totalWeight;
      for (let i = 0; i < houseIds.length; i++) {
        rnd -= weightsArr[i];
        if (rnd <= 0) return houseIds[i];
      }
      return houseIds[0];
    };

    const sizeOrder = ["S", "M", "L", "XL", "XXL"];
    const prefs = [];
    let numPref;
    if (Math.random() < 0.99) {
      numPref = 5;
    } else {
      numPref = Math.floor(Math.random() * 4) + 1;
    }

    for (let i = 0; i < numPref; i++) {
      // เลือกไซส์แบบ weighted ตาม sizeWeights
      const availableSizes = sizeOrder.filter(
        (sz) => housesBySize[sz].filter((id) => !prefs.includes(id)).length > 0
      );
      if (availableSizes.length === 0) break;
      const totalWeight = availableSizes.reduce(
        (sum, sz) => sum + sizeWeights[sz],
        0
      );
      let rnd = Math.random() * totalWeight;
      let chosenSize = availableSizes[0];
      for (const sz of availableSizes) {
        rnd -= sizeWeights[sz];
        if (rnd <= 0) {
          chosenSize = sz;
          break;
        }
      }
      const house = pickWeightedHouse(chosenSize, prefs);
      if (house) prefs.push(house);
    }

    // อันดับ 4-5 สุ่มแบบเดิม
    while (prefs.length < numPref) {
      const house = getRandomHouseByWeight(prefs);
      if (house) prefs.push(house);
    }

    // สร้าง sub preference จาก XL และ XXL ที่ยังไม่ได้เลือก
    let subPreference = [];
    const xl2xlHouses = [...housesBySize.XL, ...housesBySize.XXL].filter(
      (id) => !prefs.includes(id)
    );
    if (xl2xlHouses.length > 0) {
      const weightsArr = xl2xlHouses.map((id) => {
        const houseName = housesObj[id]?.housename;
        return subPrefWeights[houseName] ?? 0.05;
      });
      const totalWeight = weightsArr.reduce((a, b) => a + b, 0);
      let rnd = Math.random() * totalWeight;
      let chosenIdx = 0;
      for (let i = 0; i < xl2xlHouses.length; i++) {
        rnd -= weightsArr[i];
        if (rnd <= 0) {
          chosenIdx = i;
          break;
        }
      }
      // 70% โอกาสจะเลือก 1 บ้าน, 30% ไม่เลือก
      if (Math.random() < 0.7) {
        subPreference = [xl2xlHouses[chosenIdx]];
      }
    }

    groups.push({
      id: gid + 1,
      owner_id,
      member_id_1,
      member_id_2,
      member_count,
      house_rank_1: prefs[0] ?? null,
      house_rank_2: prefs[1] ?? null,
      house_rank_3: prefs[2] ?? null,
      house_rank_4: prefs[3] ?? null,
      house_rank_5: prefs[4] ?? null,
      house_rank_sub: subPreference[0] ?? null,
    });
  }
  return groups;
}

function generateData(numGroups) {
  const housesArr = FIXED_HOUSES;
  const houses = {};
  for (let i = 0; i < housesArr.length; i++) {
    houses[housesArr[i].id] = housesArr[i];
  }
  const groups = generateRandomGroups(numGroups, houses);
  return { groups, houses };
}

// Function สำหรับดึง *ทุกตาราง* ให้ออกมาเป็น .xlsx
function exportAllTablesToExcelTH(filename, data, resultVa, resultVb) {
  const wb = XLSX.utils.book_new();

  // Comparison Table
  const comparisonTable = document.getElementById("comparison-table");
  if (comparisonTable) {
    const ws1 = XLSX.utils.table_to_sheet(comparisonTable);
    XLSX.utils.book_append_sheet(wb, ws1, "เปรียบเทียบ 2 Model");
  }

  // House Receive Table
  const housePrefTable = document.getElementById("house-receive-table");
  if (housePrefTable) {
    const ws2 = XLSX.utils.table_to_sheet(housePrefTable);
    XLSX.utils.book_append_sheet(wb, ws2, "ข้อมูลบ้านที่ได้");
  }

  // Model Table
  const modelTable = document.getElementById("model-table");
  if (modelTable) {
    const ws3 = XLSX.utils.table_to_sheet(modelTable);
    XLSX.utils.book_append_sheet(wb, ws3, "ข้อมูล Model");
  }

  // Groups Table
  const groupsTable = document.getElementById("groups-table");
  if (groupsTable) {
    const ws4 = XLSX.utils.table_to_sheet(groupsTable);
    XLSX.utils.book_append_sheet(wb, ws4, "ข้อมูลกลุ่ม");
  }

  // House Picked Table
  const housePickedTable = document.getElementById("house-picked-table");
  if (housePickedTable) {
    const ws5 = XLSX.utils.table_to_sheet(housePickedTable);
    XLSX.utils.book_append_sheet(wb, ws5, "ข้อมูลบ้านที่เลือก");
  }

  // Unassigned Groups Table
  const unassignedGroupsTable = document.getElementById(
    "unassigned-groups-table"
  );
  if (unassignedGroupsTable) {
    const ws6 = XLSX.utils.table_to_sheet(unassignedGroupsTable);
    XLSX.utils.book_append_sheet(wb, ws6, "กลุ่มที่ยังไม่ได้จัด");
  }

  // House Members Tables
  if (data && resultVa && resultVb) {
    const houseMembersVa = {};
    const houseMembersVb = {};
    for (const g of data.groups) {
      const va = resultVa[g.id];
      const vb = resultVb[g.id];
      if (va) {
        if (!houseMembersVa[va]) houseMembersVa[va] = [];
        houseMembersVa[va].push(g.owner_id);
        if (g.member_id_1 != null) houseMembersVa[va].push(g.member_id_1);
        if (g.member_id_2 != null) houseMembersVa[va].push(g.member_id_2);
      }
      if (vb) {
        if (!houseMembersVb[vb]) houseMembersVb[vb] = [];
        houseMembersVb[vb].push(g.owner_id);
        if (g.member_id_1 != null) houseMembersVb[vb].push(g.member_id_1);
        if (g.member_id_2 != null) houseMembersVb[vb].push(g.member_id_2);
      }
    }
    Object.entries(data.houses).forEach(([hid, h]) => {
      // Va
      const vaMembers = houseMembersVa[hid] || [];
      const vaRows = [["รหัส"]];
      vaMembers.forEach((mid) => vaRows.push([mid]));
      const vaSheet = XLSX.utils.aoa_to_sheet(vaRows);
      XLSX.utils.book_append_sheet(wb, vaSheet, `ID ที่ได้${h.housename}(Va)`);

      // Vb
      const vbMembers = houseMembersVb[hid] || [];
      const vbRows = [["รหัส"]];
      vbMembers.forEach((mid) => vbRows.push([mid]));
      const vbSheet = XLSX.utils.aoa_to_sheet(vbRows);
      XLSX.utils.book_append_sheet(wb, vbSheet, `ID ที่ได้${h.housename}(Vb)`);
    });
  }

  XLSX.writeFile(wb, filename + ".xlsx");
}

export default function AssignPanel() {
  const [numGroups, setNumGroups] = useState(2000);
  const [data, setData] = useState(null);
  const [resultVa, setResultVa] = useState(null);
  const [resultVb, setResultVb] = useState(null);
  const [loadingVa, setLoadingVa] = useState(false);
  const [loadingVb, setLoadingVb] = useState(false);

  useEffect(() => {
    if (FIXED_GROUPS.length > 0) {
      const housesArr = FIXED_HOUSES;
      const houses = {};
      for (let i = 0; i < housesArr.length; i++) {
        houses[housesArr[i].id] = housesArr[i];
      }
      const groups = FIXED_GROUPS.map((g) => ({
        id: g.id,
        owner_id: g.owner_id,
        member_id_1: g.member_id_1 ?? null,
        member_id_2: g.member_id_2 ?? null,
        member_count: g.member_count,
        house_rank_1: g.house_rank_1,
        house_rank_2: g.house_rank_2,
        house_rank_3: g.house_rank_3,
        house_rank_4: g.house_rank_4,
        house_rank_5: g.house_rank_5,
        house_rank_sub: g.house_rank_sub,
      }));
      setData({ groups, houses });
    } else {
      setData(generateData(numGroups));
    }
    setResultVa(null);
    setResultVb(null);
  }, [numGroups]);

  if (!data) return <p>Loading...</p>;

  const totalGroupSize = data.groups.reduce(
    (sum, g) => sum + g.member_count,
    0
  );

  const totalHouseCapacity = Object.values(data.houses).reduce(
    (sum, h) => sum + h.capacity,
    0
  );

  const handleAssignVa = async () => {
    setLoadingVa(true);
    try {
      const res = await assignGroupsVa(data.groups, data.houses);
      setResultVa(res);
    } catch (error) {
      console.error("Va Assignment failed:", error);
      alert("Va Assignment failed. Please check the console for details.");
    } finally {
      setLoadingVa(false);
    }
  };

  const handleAssignVb = async () => {
    setLoadingVb(true);
    try {
      const res = await assignGroupsVb(data.groups, data.houses);
      setResultVb(res);
    } catch (error) {
      console.error("Vb Assignment failed:", error);
      alert("Vb Assignment failed. Please check the console for details.");
    } finally {
      setLoadingVb(false);
    }
  };

  const calculateHouseTotals = (result) => {
    const houseTotals = {};
    if (result) {
      for (const gid in result) {
        const hid = result[gid];
        const groups = data.groups.filter((g) => String(g.id) === String(gid));
        for (const group of groups) {
          houseTotals[hid] =
            (houseTotals[hid] || 0) + (group?.member_count ?? 0);
        }
      }
    }
    return houseTotals;
  };

  const houseTotalsVa = calculateHouseTotals(resultVa);
  const houseTotalsVb = calculateHouseTotals(resultVb);

  const houseSizeCount = {};
  Object.values(data.houses).forEach((house) => {
    houseSizeCount[house.sizename] = (houseSizeCount[house.sizename] || 0) + 1;
  });

  const calculatePercentage = (num, total) =>
    total ? (num / total) * 100 : "0.00%";

  const summaryRow = (() => {
    const totalMembers = data.groups.reduce(
      (sum, g) => sum + g.member_count,
      0
    );
    const vaTotalCount = [
      "rank1",
      "rank2",
      "rank3",
      "rank4",
      "rank5",
      "subPref",
      "unranked",
    ].reduce((sum, key) => {
      const countPeople = (result, rankKey) => {
        let count = 0;
        for (const group of data.groups) {
          const assigned = resultVa?.[group.id];
          if (!assigned) continue;
          if (rankKey === "rank1" && group.house_rank_1 === assigned)
            count += group.member_count;
          else if (rankKey === "rank2" && group.house_rank_2 === assigned)
            count += group.member_count;
          else if (rankKey === "rank3" && group.house_rank_3 === assigned)
            count += group.member_count;
          else if (rankKey === "rank4" && group.house_rank_4 === assigned)
            count += group.member_count;
          else if (rankKey === "rank5" && group.house_rank_5 === assigned)
            count += group.member_count;
          else if (
            rankKey === "subPref" &&
            group.house_rank_sub === assigned &&
            ![
              group.house_rank_1,
              group.house_rank_2,
              group.house_rank_3,
              group.house_rank_4,
              group.house_rank_5,
            ].includes(assigned)
          )
            count += group.member_count;
          else if (
            rankKey === "unranked" &&
            ![
              group.house_rank_1,
              group.house_rank_2,
              group.house_rank_3,
              group.house_rank_4,
              group.house_rank_5,
              group.house_rank_sub,
            ].includes(assigned)
          )
            count += group.member_count;
        }
        return count;
      };
      return sum + countPeople(resultVa, key);
    }, 0);

    const vbTotalCount = [
      "rank1",
      "rank2",
      "rank3",
      "rank4",
      "rank5",
      "subPref",
      "unranked",
    ].reduce((sum, key) => {
      const countPeople = (result, rankKey) => {
        let count = 0;
        for (const group of data.groups) {
          const assigned = resultVb?.[group.id];
          if (!assigned) continue;
          if (rankKey === "rank1" && group.house_rank_1 === assigned)
            count += group.member_count;
          else if (rankKey === "rank2" && group.house_rank_2 === assigned)
            count += group.member_count;
          else if (rankKey === "rank3" && group.house_rank_3 === assigned)
            count += group.member_count;
          else if (rankKey === "rank4" && group.house_rank_4 === assigned)
            count += group.member_count;
          else if (rankKey === "rank5" && group.house_rank_5 === assigned)
            count += group.member_count;
          else if (
            rankKey === "subPref" &&
            group.house_rank_sub === assigned &&
            ![
              group.house_rank_1,
              group.house_rank_2,
              group.house_rank_3,
              group.house_rank_4,
              group.house_rank_5,
            ].includes(assigned)
          )
            count += group.member_count;
          else if (
            rankKey === "unranked" &&
            ![
              group.house_rank_1,
              group.house_rank_2,
              group.house_rank_3,
              group.house_rank_4,
              group.house_rank_5,
              group.house_rank_sub,
            ].includes(assigned)
          )
            count += group.member_count;
        }
        return count;
      };
      return sum + countPeople(resultVb, key);
    }, 0);

    const diff = vbTotalCount - vaTotalCount;

    return (
      <tr style={{ backgroundColor: "#f0f0f0", fontWeight: "bold" }}>
        <td style={{ ...thTdStyle, fontWeight: "bold" }}>รวม</td>
        <td style={{ ...thTdStyle, fontWeight: "bold" }}>{vaTotalCount}</td>
        <td style={{ ...thTdStyle, fontWeight: "bold" }}>
          {totalMembers > 0
            ? `${(vaTotalCount / totalMembers) * 100}%`
            : "0.00%"}
        </td>
        <td style={{ ...thTdStyle, fontWeight: "bold" }}>{vbTotalCount}</td>
        <td style={{ ...thTdStyle, fontWeight: "bold" }}>
          {totalMembers > 0
            ? `${(vbTotalCount / totalMembers) * 100}%`
            : "0.00%"}
        </td>
        <td style={{ ...thTdStyle, fontWeight: "bold" }}>
          {diff >= 0 ? `+${diff}` : `${diff}`}
        </td>
      </tr>
    );
  })();

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", padding: "1rem" }}>
      <h2>Group Assignment Demo</h2>
      {FIXED_GROUPS.length == 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ marginRight: "1rem" }}>
            Number of Groups:
            <input
              type="number"
              min={1}
              value={numGroups}
              onChange={(e) => setNumGroups(+e.target.value)}
            />
          </label>
        </div>
      )}

      <div style={{ marginBottom: "1rem" }}>
        <button
          onClick={handleAssignVa}
          disabled={loadingVa}
          style={loadingVa ? secondaryButtonStyle : buttonStyle}
        >
          {loadingVa ? "Assigning Va..." : "Assign Groups Va"}
        </button>
        <button
          onClick={handleAssignVb}
          disabled={loadingVb}
          style={loadingVb ? secondaryButtonStyle : buttonStyle}
        >
          {loadingVb ? "Assigning Vb..." : "Assign Groups Vb"}
        </button>
        {FIXED_GROUPS.length == 0 && (
          <button
            onClick={() => {
              setData(generateData(numGroups));
              setResultVa(null);
              setResultVb(null);
            }}
            disabled={loadingVa || loadingVb}
            style={
              loadingVa || loadingVb
                ? secondaryButtonStyle
                : { ...buttonStyle, backgroundColor: "#6c757d" }
            }
          >
            Regenerate Data
          </button>
        )}
        {resultVa && resultVb && (
          <>
            <button
              style={{ ...buttonStyle, backgroundColor: "#28a745" }}
              onClick={() =>
                exportAllTablesToExcelTH(
                  "RPKM68-Result",
                  data,
                  resultVa,
                  resultVb
                )
              }
            >
              Export All Tables
            </button>
          </>
        )}
      </div>

      <p>Total Groups: {data.groups.length}</p>
      <ul>
        <li>
          Group of 1: {data.groups.filter((g) => g.member_count === 1).length}
        </li>
        <li>
          Group of 2: {data.groups.filter((g) => g.member_count === 2).length}
        </li>
        <li>
          Group of 3: {data.groups.filter((g) => g.member_count === 3).length}
        </li>
      </ul>

      <p>Total Group Members: {totalGroupSize}</p>
      <p>Total House Capacity: {totalHouseCapacity}</p>

      {(resultVa || resultVb) && (
        <>
          <h3>เปรียบเทียบสรุปผล</h3>
          <table style={tableStyle} id="comparison-table">
            <thead>
              <tr>
                <th style={headerStyle}>ลำดับที่ได้</th>
                <th style={headerStyle}>จำนวน (Va)</th>
                <th style={headerStyle}>เปอร์เซ็นต์ (Va)</th>
                <th style={headerStyle}>จำนวน (Vb)</th>
                <th style={headerStyle}>เปอร์เซ็นต์ (Vb)</th>
                <th style={headerStyle}>ผลต่าง</th>
              </tr>
            </thead>
            <tbody>
              {[
                "rank1",
                "rank2",
                "rank3",
                "rank4",
                "rank5",
                "subPref",
                "unranked",
              ].map((key, i) => {
                const countPeople = (result, rankKey) => {
                  let count = 0;
                  for (const group of data.groups) {
                    const assigned = result?.[group.id];
                    if (!assigned) continue;
                    if (rankKey === "rank1" && group.house_rank_1 === assigned)
                      count += group.member_count;
                    else if (
                      rankKey === "rank2" &&
                      group.house_rank_2 === assigned
                    )
                      count += group.member_count;
                    else if (
                      rankKey === "rank3" &&
                      group.house_rank_3 === assigned
                    )
                      count += group.member_count;
                    else if (
                      rankKey === "rank4" &&
                      group.house_rank_4 === assigned
                    )
                      count += group.member_count;
                    else if (
                      rankKey === "rank5" &&
                      group.house_rank_5 === assigned
                    )
                      count += group.member_count;
                    else if (
                      rankKey === "subPref" &&
                      group.house_rank_sub === assigned &&
                      ![
                        group.house_rank_1,
                        group.house_rank_2,
                        group.house_rank_3,
                        group.house_rank_4,
                        group.house_rank_5,
                      ].includes(assigned)
                    )
                      count += group.member_count;
                    else if (
                      rankKey === "unranked" &&
                      ![
                        group.house_rank_1,
                        group.house_rank_2,
                        group.house_rank_3,
                        group.house_rank_4,
                        group.house_rank_5,
                        group.house_rank_sub,
                      ].includes(assigned)
                    )
                      count += group.member_count;
                  }
                  return count;
                };
                const totalMembers = data.groups.reduce(
                  (sum, g) => sum + g.member_count,
                  0
                );
                const VaCount = resultVa ? countPeople(resultVa, key) : 0;
                const VbCount = resultVb ? countPeople(resultVb, key) : 0;
                const diff = VbCount - VaCount;
                const percent = (n) =>
                  totalMembers > 0 ? `${(n / totalMembers) * 100}%` : "0.00%";
                return (
                  <tr key={key}>
                    <td style={thTdStyle}>
                      {key === "unranked"
                        ? "นอกลำดับ"
                        : key === "subPref"
                        ? "Sub Preference"
                        : `อันดับ ${i + 1}`}
                    </td>
                    <td style={thTdStyle}>{resultVa ? VaCount : "-"}</td>
                    <td style={thTdStyle}>
                      {resultVa ? percent(VaCount) : "-"}
                    </td>
                    <td style={thTdStyle}>{resultVb ? VbCount : "-"}</td>
                    <td style={thTdStyle}>
                      {resultVb ? percent(VbCount) : "-"}
                    </td>
                    <td
                      style={{
                        ...thTdStyle,
                        backgroundColor:
                          resultVa && resultVb
                            ? diff > 0
                              ? "#d4edda"
                              : diff < 0
                              ? "#f8d7da"
                              : "#fff3cd"
                            : "transparent",
                        fontWeight: diff !== 0 ? "bold" : "normal",
                      }}
                    >
                      {resultVa && resultVb
                        ? diff >= 0
                          ? `+${diff}`
                          : `${diff}`
                        : "-"}
                    </td>
                  </tr>
                );
              })}
              {/* Summary Row */}
              {summaryRow}
            </tbody>
          </table>

          <h3>สถิติการเลือกบ้าน (จำนวนน้องที่ได้บ้านในแต่ละอันดับ)</h3>
          <table style={tableStyle} id="house-receive-table">
            <thead>
              <tr>
                <th style={headerStyle}>ลำดับ</th>
                <th style={headerStyle}>รหัสบ้าน</th>
                <th style={headerStyle}>ชื่อบ้าน</th>
                <th style={headerStyle}>ไซส์</th>
                <th style={headerStyle}>ความจุ</th>
                <th style={headerStyle}>Va อันดับ 1</th>
                <th style={headerStyle}>Va อันดับ 2</th>
                <th style={headerStyle}>Va อันดับ 3</th>
                <th style={headerStyle}>Va อันดับ 4</th>
                <th style={headerStyle}>Va อันดับ 5</th>
                <th style={headerStyle}>Va สำรอง</th>
                <th style={headerStyle}>Vb อันดับ 1</th>
                <th style={headerStyle}>Vb อันดับ 2</th>
                <th style={headerStyle}>Vb อันดับ 3</th>
                <th style={headerStyle}>Vb อันดับ 4</th>
                <th style={headerStyle}>Vb อันดับ 5</th>
                <th style={headerStyle}>Vb สำรอง</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data.houses).map(([hid, h], idx) => {
                const countRank = (result, rank) => {
                  let count = 0;
                  for (const group of data.groups) {
                    const assigned = result?.[group.id];
                    if (String(assigned) === String(hid)) {
                      if (rank === "sub") {
                        if (
                          group.house_rank_sub === assigned &&
                          ![
                            group.house_rank_1,
                            group.house_rank_2,
                            group.house_rank_3,
                            group.house_rank_4,
                            group.house_rank_5,
                          ].includes(assigned)
                        )
                          count += group.member_count;
                      } else {
                        const ranks = [
                          group.house_rank_1,
                          group.house_rank_2,
                          group.house_rank_3,
                          group.house_rank_4,
                          group.house_rank_5,
                        ];
                        if (ranks[rank] === assigned)
                          count += group.member_count;
                      }
                    }
                  }
                  return count;
                };

                // Va
                const vaRank1 = countRank(resultVa, 0);
                const vaRank2 = countRank(resultVa, 1);
                const vaRank3 = countRank(resultVa, 2);
                const vaRank4 = countRank(resultVa, 3);
                const vaRank5 = countRank(resultVa, 4);
                const vaSub = countRank(resultVa, "sub");
                // Vb
                const vbRank1 = countRank(resultVb, 0);
                const vbRank2 = countRank(resultVb, 1);
                const vbRank3 = countRank(resultVb, 2);
                const vbRank4 = countRank(resultVb, 3);
                const vbRank5 = countRank(resultVb, 4);
                const vbSub = countRank(resultVb, "sub");

                return (
                  <tr key={hid}>
                    <td style={thTdStyle}>{idx + 1}</td>
                    <td style={thTdStyle}>{h.id}</td>
                    <td style={thTdStyle}>{h.housename}</td>
                    <td style={thTdStyle}>{h.sizename}</td>
                    <td style={thTdStyle}>{h.capacity}</td>
                    <td style={thTdStyle}>{vaRank1}</td>
                    <td style={thTdStyle}>{vaRank2}</td>
                    <td style={thTdStyle}>{vaRank3}</td>
                    <td style={thTdStyle}>{vaRank4}</td>
                    <td style={thTdStyle}>{vaRank5}</td>
                    <td style={thTdStyle}>{vaSub}</td>
                    <td style={thTdStyle}>{vbRank1}</td>
                    <td style={thTdStyle}>{vbRank2}</td>
                    <td style={thTdStyle}>{vbRank3}</td>
                    <td style={thTdStyle}>{vbRank4}</td>
                    <td style={thTdStyle}>{vbRank5}</td>
                    <td style={thTdStyle}>{vbSub}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <h3>
            กลุ่มที่ไม่ได้รับบ้าน - Va:
            {
              Object.keys(
                data.groups.filter(
                  (g) => !resultVa?.[g.id] || resultVa[g.id] === null
                )
              ).length
            }
            , Vb:
            {
              Object.keys(
                data.groups.filter(
                  (g) => !resultVb?.[g.id] || resultVb[g.id] === null
                )
              ).length
            }
          </h3>
          <table style={tableStyle} id="unassigned-groups-table">
            <thead>
              <tr>
                <th style={headerStyle}>ลำดับ</th>
                <th style={headerStyle}>รหัสกลุ่ม</th>
                <th style={headerStyle}>รหัสหัวหน้า</th>
                <th style={headerStyle}>จำนวนสมาชิก</th>
                <th style={headerStyle}>บ้านที่ได้ (Va)</th>
                <th style={headerStyle}>บ้านที่ได้ (Vb)</th>
              </tr>
            </thead>
            <tbody>
              {data.groups
                .filter(
                  (g) =>
                    !resultVa?.[g.id] ||
                    resultVa[g.id] === null ||
                    !resultVb?.[g.id] ||
                    resultVb[g.id] === null
                )
                .map((g, idx) => (
                  <tr key={g.id}>
                    <td style={thTdStyle}>{idx + 1}</td>
                    <td style={thTdStyle}>{g.id}</td>
                    <td style={thTdStyle}>{g.owner_id}</td>
                    <td style={thTdStyle}>{g.member_count}</td>
                    <td style={thTdStyle}>{resultVa?.[g.id] ?? "-"}</td>
                    <td style={thTdStyle}>{resultVb?.[g.id] ?? "-"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </>
      )}

      <h3>สถิติการเลือกบ้าน (จำนวนน้องที่เลือกแต่ละบ้านในแต่ละอันดับ)</h3>
      <table style={tableStyle} id="house-picked-table">
        <thead>
          <tr>
            <th style={headerStyle}>ลำดับ</th>
            <th style={headerStyle}>รหัสบ้าน</th>
            <th style={headerStyle}>ชื่อบ้าน</th>
            <th style={headerStyle}>ไซส์</th>
            <th style={headerStyle}>ความจุ</th>
            <th style={headerStyle}>เลือกอันดับ 1</th>
            <th style={headerStyle}>เลือกอันดับ 2</th>
            <th style={headerStyle}>เลือกอันดับ 3</th>
            <th style={headerStyle}>เลือกอันดับ 4</th>
            <th style={headerStyle}>เลือกอันดับ 5</th>
            <th style={headerStyle}>เลือกสำรอง</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(data.houses).map(([hid, h], idx) => {
            const pickedRank = (rank) =>
              data.groups.reduce(
                (sum, g) =>
                  g[`house_rank_${rank}`] !== null &&
                  g[`house_rank_${rank}`] !== undefined &&
                  String(g[`house_rank_${rank}`]) === String(hid)
                    ? sum + (g.member_count || 0)
                    : sum,
                0
              );
            const pickedSub = data.groups.reduce(
              (sum, g) =>
                g.house_rank_sub &&
                String(g.house_rank_sub) === String(hid) &&
                ![
                  g.house_rank_1,
                  g.house_rank_2,
                  g.house_rank_3,
                  g.house_rank_4,
                  g.house_rank_5,
                ].includes(g.house_rank_sub)
                  ? sum + (g.member_count || 0)
                  : sum,
              0
            );
            return (
              <tr key={hid}>
                <td style={thTdStyle}>{idx + 1}</td>
                <td style={thTdStyle}>{h.id}</td>
                <td style={thTdStyle}>{h.housename}</td>
                <td style={thTdStyle}>{h.sizename}</td>
                <td style={thTdStyle}>{h.capacity}</td>
                <td style={thTdStyle}>{pickedRank(1)}</td>
                <td style={thTdStyle}>{pickedRank(2)}</td>
                <td style={thTdStyle}>{pickedRank(3)}</td>
                <td style={thTdStyle}>{pickedRank(4)}</td>
                <td style={thTdStyle}>{pickedRank(5)}</td>
                <td style={thTdStyle}>{pickedSub}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h3>เปรียบเทียบ Model</h3>
      <table style={tableStyle} id="model-table">
        <thead>
          <tr>
            <th style={headerStyle}>ลำดับ</th>
            <th style={headerStyle}>รหัสบ้าน</th>
            <th style={headerStyle}>ชื่อบ้าน</th>
            <th style={headerStyle}>ไซส์</th>
            <th style={headerStyle}>ความจุ</th>
            <th style={headerStyle}>Va ได้รับ</th>
            <th style={headerStyle}>เปอร์เซ็นต์ (Va)</th>
            <th style={headerStyle}>Vb ได้รับ</th>
            <th style={headerStyle}>เปอร์เซ็นต์ (Vb)</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(data.houses).map(([hid, h], idx) => (
            <tr key={hid}>
              <td style={thTdStyle}>{idx + 1}</td>
              <td style={thTdStyle}>{hid}</td>
              <td style={thTdStyle}>{h.housename}</td>
              <td style={thTdStyle}>{h.sizename}</td>
              <td style={thTdStyle}>{h.capacity}</td>
              <td style={thTdStyle}>
                {resultVa ? houseTotalsVa[hid] ?? 0 : "-"}
              </td>
              <td style={thTdStyle}>
                {resultVa
                  ? `${calculatePercentage(
                      houseTotalsVa[hid] ?? 0,
                      h.capacity
                    )}%`
                  : "-"}
              </td>
              <td style={thTdStyle}>
                {resultVb ? houseTotalsVb[hid] ?? 0 : "-"}
              </td>
              <td style={thTdStyle}>
                {resultVb
                  ? `${calculatePercentage(
                      houseTotalsVb[hid] ?? 0,
                      h.capacity
                    )}%`
                  : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>ผลการจัดกลุ่ม</h3>
      <table style={tableStyle} id="groups-table">
        <thead>
          <tr>
            <th style={headerStyle}>ลำดับ</th>
            <th style={headerStyle}>รหัสกลุ่ม</th>
            <th style={headerStyle}>รหัสหัวหน้า</th>
            <th style={headerStyle}>รหัสสมาชิก 1</th>
            <th style={headerStyle}>รหัสสมาชิก 2</th>
            <th style={headerStyle}>จำนวน (คน)</th>
            <th style={headerStyle}>อันดับ 1</th>
            <th style={headerStyle}>อันดับ 2</th>
            <th style={headerStyle}>อันดับ 3</th>
            <th style={headerStyle}>อันดับ 4</th>
            <th style={headerStyle}>อันดับ 5</th>
            <th style={headerStyle}>สำรอง</th>
            <th style={headerStyle}>รหัสบ้าน (Va)</th>
            <th style={headerStyle}>ชื่อบ้าน (Va)</th>
            <th style={headerStyle}>ลำดับที่ได้ (Va)</th>
            <th style={headerStyle}>รหัสบ้าน (Vb)</th>
            <th style={headerStyle}>ชื่อบ้าน (Vb)</th>
            <th style={headerStyle}>ลำดับที่ได้ (Vb)</th>
          </tr>
        </thead>
        <tbody>
          {data.groups.map((g, idx) => {
            const assignedVa = resultVa?.[g.id];
            const assignedVb = resultVb?.[g.id];
            const ranks = [
              g.house_rank_1,
              g.house_rank_2,
              g.house_rank_3,
              g.house_rank_4,
              g.house_rank_5,
            ];
            const indexVa = assignedVa ? ranks.indexOf(assignedVa) : -1;
            const indexVb = assignedVb ? ranks.indexOf(assignedVb) : -1;
            const isSubPrefVa =
              assignedVa &&
              g.house_rank_sub === assignedVa &&
              !ranks.includes(assignedVa);
            const isSubPrefVb =
              assignedVb &&
              g.house_rank_sub === assignedVb &&
              !ranks.includes(assignedVb);

            const getHouseNameWithSize = (hid) => {
              if (!hid) return "-";
              const house = data.houses[hid];
              if (!house) return hid;
              return `${house.housename} (${house.sizename})`;
            };

            const getCellStyle = (index, isSubPref) => ({
              textAlign: "center",
              backgroundColor:
                index >= 0 ? "#d4edda" : isSubPref ? "#fff3cd" : "#f8d7da",
            });

            const getHouseDisplay = (assigned, index, isSubPref) => {
              if (!assigned) return "-";
              const housename = data.houses[assigned]?.housename || assigned;
              return housename;
            };

            const getRankDisplay = (index, isSubPref, assigned) => {
              if (!assigned) return "-";
              if (index >= 0) return `${index + 1}`;
              if (isSubPref) return "Sub";
              return "นอกลำดับ";
            };

            return (
              <tr key={g.id}>
                <td style={thTdStyle}>{idx + 1}</td>
                <td style={thTdStyle}>{g.id}</td>
                <td style={thTdStyle}>{g.owner_id}</td>
                <td style={thTdStyle}>{g.member_id_1 ?? "-"}</td>
                <td style={thTdStyle}>{g.member_id_2 ?? "-"}</td>
                <td style={thTdStyle}>{g.member_count}</td>
                <td style={thTdStyle}>
                  {g.house_rank_1 ? getHouseNameWithSize(g.house_rank_1) : "-"}
                </td>
                <td style={thTdStyle}>
                  {g.house_rank_2 ? getHouseNameWithSize(g.house_rank_2) : "-"}
                </td>
                <td style={thTdStyle}>
                  {g.house_rank_3 ? getHouseNameWithSize(g.house_rank_3) : "-"}
                </td>
                <td style={thTdStyle}>
                  {g.house_rank_4 ? getHouseNameWithSize(g.house_rank_4) : "-"}
                </td>
                <td style={thTdStyle}>
                  {g.house_rank_5 ? getHouseNameWithSize(g.house_rank_5) : "-"}
                </td>
                <td style={thTdStyle}>
                  {g.house_rank_sub
                    ? getHouseNameWithSize(g.house_rank_sub)
                    : "-"}
                </td>
                <td
                  style={
                    assignedVa ? getCellStyle(indexVa, isSubPrefVa) : thTdStyle
                  }
                >
                  {assignedVa ?? "-"}
                </td>
                <td
                  style={
                    assignedVa ? getCellStyle(indexVa, isSubPrefVa) : thTdStyle
                  }
                >
                  {getHouseDisplay(assignedVa, indexVa, isSubPrefVa)}
                </td>
                <td
                  style={
                    assignedVa ? getCellStyle(indexVa, isSubPrefVa) : thTdStyle
                  }
                >
                  {getRankDisplay(indexVa, isSubPrefVa, assignedVa)}
                </td>
                <td
                  style={
                    assignedVb ? getCellStyle(indexVb, isSubPrefVb) : thTdStyle
                  }
                >
                  {assignedVb ?? "-"}
                </td>
                <td
                  style={
                    assignedVb ? getCellStyle(indexVb, isSubPrefVb) : thTdStyle
                  }
                >
                  {getHouseDisplay(assignedVb, indexVb, isSubPrefVb)}
                </td>
                <td
                  style={
                    assignedVb ? getCellStyle(indexVb, isSubPrefVb) : thTdStyle
                  }
                >
                  {getRankDisplay(indexVb, isSubPrefVb, assignedVb)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
