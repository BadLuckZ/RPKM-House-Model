export const assignGroupsVa = async (groups, houses) => {
  try {
    let housesData;
    if (Array.isArray(houses)) {
      housesData = {};
      houses.forEach((house) => {
        housesData[house.id] = house;
      });
    } else {
      housesData = {};
      Object.entries(houses).forEach(([id, house]) => {
        housesData[id] = house;
      });
    }

    const response = await fetch("http://localhost:8000/api/solve_va", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ groups, houses: housesData }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error calling Va API:", error);
    throw error;
  }
};

export const assignGroupsVb = async (groups, houses) => {
  try {
    const response = await fetch("http://localhost:8000/api/solve_vb", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ groups, houses }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error calling Vb API:", error);
    throw error;
  }
};
