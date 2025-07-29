from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pulp import *
import math

app = FastAPI()

# ตั้งค่า CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4321", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================================================================
# CONSTANTS สำหรับ VA
# =============================================================================

PREF_SCORE_A = [10000, 1000, 100, 10, 1]    # คะแนนสำหรับอันดับ 1-5
SUB_PREF_SCORE_A = -100000                  # คะแนนลบสำหรับ sub-preference
TIME_LIMIT_A = 60                           # เวลาสูงสุดในการแก้ปัญหา (วินาที)
MIN_RATIO_A = 0.4                           # อัตราส่วนขั้นต่ำที่ทุกบ้านต้องมีคน (40% ของ capacity)

# =============================================================================
# เน้นให้ได้อันดับ 1 มากที่สุดก่อน ตามด้วย 2 และตามด้วย 3,4,5
# =============================================================================

@app.post("/api/solve_va")
async def solve_va(request: Request):
    data = await request.json()
    # print(data)
    groups = data.get("groups", [])
    houses = data.get("houses", {})

    if not groups or not houses:
        return JSONResponse(status_code=400, content={"message": "Invalid input data"})

    # =============================================================================
    # เตรียมข้อมูล
    # =============================================================================
    group_size_map = {}
    preference_index_cache = {}
    groups_with_preferences = []
    x = {}  # Decision variables

    for g in groups:
        gid = g["id"]
        # รวบรวมบ้านที่เลือกไว้
        prefs = [g.get(f"house_rank_{i+1}") for i in range(5) if g.get(f"house_rank_{i+1}")]
        subs = [g.get("house_rank_sub")] if g.get("house_rank_sub") else []
        allowed = set(prefs) | set(subs)
        
        if allowed:
            groups_with_preferences.append(g)
            group_size_map[gid] = g.get("member_count", 1)
            preference_index_cache[gid] = {h: i for i, h in enumerate(prefs)}
            
            # สร้าง variables สำหรับทุกบ้านที่กลุ่มนี้เลือก
            for h in allowed:
                if h in houses:
                    x[(gid, h)] = LpVariable(f"x_{gid}_{h}", cat=LpBinary)

    if not x:
        result = {}
        for g in groups:
            result[g["id"]] = None
        return JSONResponse(result)

    # =============================================================================
    # Helper Functions
    # =============================================================================
    def add_basic_constraints(prob):
        # Constraint 1: ทุกกลุ่มต้องได้บ้านเดียวเท่านั้น
        for gid in group_size_map:
            group_vars = [x[(gid, h)] for (gid_check, h) in x if gid_check == gid]
            if group_vars:
                prob += lpSum(group_vars) == 1, f"OneHousePerGroup_{gid}"

        # Constraint 2: ไม่เกิน capacity
        for h in houses:
            house_vars = [x[(gid, h)] * group_size_map[gid] for (gid, h_check) in x if h_check == h]
            if house_vars:
                prob += lpSum(house_vars) <= houses[h]["capacity"], f"Capacity_{h}"
                
        # Constraint 3: บ้านแต่ละหลังต้องมีคนอย่างน้อย MIN_RATIO_A ของ capacity
        for h in houses:
            house_vars = [x[(gid, h)] * group_size_map[gid] for (gid, h_check) in x if h_check == h]
            min_people = math.ceil((houses[h]["capacity"] * MIN_RATIO_A))
            if house_vars and houses[h]["capacity"] > 0:
                prob += lpSum(house_vars) >= min_people, f"MinOccupancy_{h}"

    def get_rank_variables(target_ranks):
        rank_vars = []
        for (gid, h) in x:
            if h in preference_index_cache[gid]:
                rank_index = preference_index_cache[gid][h]
                if rank_index + 1 in target_ranks:
                    rank_vars.append(x[(gid, h)])
        return rank_vars

    # =============================================================================
    # LEXICOGRAPHIC OPTIMIZATION: แก้ปัญหาเป็น 3 stages
    # Stage 1: Maximize อันดับ 1 
    # Stage 2: Maximize อันดับ 2 (ภายใต้ constraint ของ stage 1)
    # Stage 3: Maximize อันดับ 3+4+5 (ภายใต้ constraint ของ stage 1-2)
    # =============================================================================
    
    stage_constraints = []  # เก็บ constraints จาก stages ก่อนหน้า
    stage_results = {}      # เก็บผลลัพธ์แต่ละ stage
    
    solver = PULP_CBC_CMD(msg=0, timeLimit=TIME_LIMIT_A)

    # STAGE 1: Maximize อันดับ 1
    rank_1_vars = get_rank_variables([1])  # เฉพาะอันดับ 1
    
    if rank_1_vars:
        stage1_prob = LpProblem("LexicographicStage1", LpMaximize)
        stage1_prob += lpSum(rank_1_vars), "MaximizeRank1"
        add_basic_constraints(stage1_prob)

        status = stage1_prob.solve(solver)

        if status == LpStatusOptimal:
            optimal_rank_1 = value(stage1_prob.objective)
            stage_results["rank_1"] = optimal_rank_1
            
            # Fix ผลลัพธ์ stage 2
            if optimal_rank_1 > 0:
                constraint = lpSum(rank_1_vars) == optimal_rank_1
                stage_constraints.append(constraint)

    # STAGE 2: Maximize อันดับ 2 ภายใต้ constraint ของ stage 1
    rank_2_vars = get_rank_variables([2])  # อันดับ 2
    
    if rank_2_vars and optimal_rank_1 > 0:
        stage2_prob = LpProblem("LexicographicStage2", LpMaximize)
        stage2_prob += lpSum(rank_2_vars), "MaximizeRank2"
        add_basic_constraints(stage2_prob)

        # เพิ่ม constraints จาก stage 1
        for constraint in stage_constraints:
            stage2_prob += constraint
            
        status = stage2_prob.solve(solver)

        if status == LpStatusOptimal:
            optimal_rank_2 = value(stage2_prob.objective)
            stage_results["rank_2"] = optimal_rank_2
            
            # Fix ผลลัพธ์ stage 1
            if optimal_rank_2 > 0:
                constraint = lpSum(rank_2_vars) == optimal_rank_2
                stage_constraints.append(constraint)
                
    # STAGE 3: Maximize อันดับ 3+4+5 ภายใต้ constraint ของ stage 1-2
    rank_3_4_5_vars = get_rank_variables([3, 4, 5])
    
    if rank_3_4_5_vars:
        stage3_prob = LpProblem("LexicographicStage3", LpMaximize)
        stage3_prob += lpSum(rank_3_4_5_vars), "MaximizeRank3to5"
        add_basic_constraints(stage3_prob)
        
        # เพิ่ม constraints จาก stage 1-2
        for constraint in stage_constraints:
            stage3_prob += constraint
        
        status = stage3_prob.solve(solver)
        
        if status == LpStatusOptimal:
            optimal_rank_3_4_5 = value(stage3_prob.objective)
            stage_results["rank_3_4_5"] = optimal_rank_3_4_5
            
            # Fix ผลลัพธ์ stage 3
            if optimal_rank_3_4_5 > 0:
                constraint = lpSum(rank_3_4_5_vars) == optimal_rank_3_4_5
                stage_constraints.append(constraint)

    # =============================================================================
    # Final Solve
    # =============================================================================
    
    final_prob = LpProblem("LexicographicFinal", LpMaximize)
    
    # สร้างฟังก์ชันเป้าหมายสำหรับ tie-breaking (เน้นอันดับดีกว่า)
    objective_terms = []
    for (gid, h) in x:
        if h in preference_index_cache[gid]:
            # บ้านที่อยู่ในอันดับ 1-5
            rank_index = preference_index_cache[gid][h]
            score = PREF_SCORE_A[rank_index]
            objective_terms.append(x[(gid, h)] * score)
        else:
            # บ้าน sub-preference
            objective_terms.append(x[(gid, h)] * SUB_PREF_SCORE_A)
    
    if objective_terms:
        final_prob += lpSum(objective_terms), "TieBreakingScore"
    
    # เพิ่ม constraints พื้นฐาน
    add_basic_constraints(final_prob)
    
    # เพิ่ม constraints จากทุก stages
    for constraint in stage_constraints:
        final_prob += constraint
    
    # แก้ปัญหาครั้งสุดท้าย
    final_status = final_prob.solve(solver)
    
    # =============================================================================
    # สร้างผลลัพธ์และสถิติ
    # =============================================================================
    
    result = {}
    
    if final_status == LpStatusOptimal:
        # ดึงผลลัพธ์การจัดสรร
        for g in groups:
            gid = g["id"]
            result[gid] = None
            
            # หาบ้านที่กลุ่มนี้ได้รับ assignment
            for (gid_check, h), var in x.items():
                if gid_check == gid and var.varValue and var.varValue > 0.5:
                    result[gid] = h
                    break
        
        # คำนวณสถิติผลลัพธ์
        rank_counts = {i: 0 for i in range(1, 6)}
        sub_count = 0
        no_house_count = 0
        
        for g in groups:
            gid = g["id"]
            assigned_house = result[gid]
            
            if assigned_house is None:
                no_house_count += 1
            elif assigned_house in preference_index_cache.get(gid, {}):
                rank_index = preference_index_cache[gid][assigned_house]
                rank_counts[rank_index + 1] += 1
            else:
                sub_count += 1
        
    else:
        # ถ้าแก้ปัญหาไม่สำเร็จ ให้ผลลัพธ์เป็น None ทุกกลุ่ม
        for g in groups:
            result[g["id"]] = None

    return JSONResponse(result)

# =============================================================================
# CONSTANTS สำหรับ VB
# =============================================================================

PREF_SCORE_B = [500, 220, 100, 40, 15]  # คะแนนสำหรับอันดับ 1-5
SUB_PREF_SCORE_B = -2000                # คะแนนลบสำหรับ sub-preference
TIME_LIMIT_B = 60                       # เวลาสูงสุดในการแก้ปัญหา (วินาที)
MIN_RATIO_B = 0.35                      # อัตราส่วนขั้นต่ำที่ทุกบ้านต้องมีคน (35% ของ capacity)

# =============================================================================
# คะแนนรวมให้สูงสุด (ไม่แคร์เรื่องอันดับเท่า Va) + บังคับให้ทุกบ้านมีคนอย่างน้อย 35%
# =============================================================================

@app.post("/api/solve_vb")
async def solve_vb(request: Request):
    # รับข้อมูลจาก request
    data = await request.json()
    # print(data)
    groups = data["groups"]

    # รองรับข้อมูลบ้านทั้งแบบ dict และ list
    if isinstance(data["houses"], dict):
        houses = {k: v for k, v in data["houses"].items()}
    elif isinstance(data["houses"], list):
        houses = {h["id"]: h for h in data["houses"]}
    else:
        raise Exception("Invalid houses format")

    result = {}
    
    # สร้างปัญหา Linear Programming
    prob = LpProblem("FullGroupAssignment", LpMaximize)
    x = {}  # Decision variables: x[(gid, h)] = 1 ถ้ากลุ่ม gid ได้บ้าน h

    # =============================================================================
    # เตรียมข้อมูลและสร้าง Decision Variables
    # =============================================================================
    group_size_map = {}              # เก็บขนาดของแต่ละกลุ่ม
    preference_index_cache = {}      # เก็บ index ของบ้านในอันดับ 1-5 ของแต่ละกลุ่ม
    groups_with_preferences = []     # กลุ่มที่มีการเลือกบ้าน

    for g in groups:
        gid = g["id"]
        # รวบรวมบ้านที่เลือกไว้ในอันดับ 1-5
        prefs = [g.get(f"house_rank_{i+1}") for i in range(5) if g.get(f"house_rank_{i+1}") is not None]
        # รวบรวมบ้าน sub-preference
        subs = [g.get("house_rank_sub")] if g.get("house_rank_sub") is not None else []
        
        # รวมบ้านทั้งหมดที่กลุ่มนี้สามารถไปได้
        allowed = set(prefs) | set(subs)
        
        # ตรวจสอบว่ามีการเลือกบ้านอย่างน้อย 1 หลัง
        if allowed:
            groups_with_preferences.append(g)
            group_size_map[gid] = g.get("member_count", 1)
            # สร้าง mapping: บ้าน -> index ในอันดับ 1-5 (สำหรับคำนวณคะแนน)
            preference_index_cache[gid] = {h: i for i, h in enumerate(prefs)}
            
            # สร้าง decision variables สำหรับทุกบ้านที่กลุ่มนี้เลือกไว้
            for h in allowed:
                if h in houses:
                    x[(gid, h)] = LpVariable(f"x_{gid}_{h}", cat=LpBinary)

    # ถ้าไม่มี variables (ไม่มีกลุ่มที่เลือกบ้าน) ให้ return None ทุกกลุ่ม
    if not x:
        for g in groups:
            result[g["id"]] = None
        return JSONResponse(result)

    # =============================================================================
    # ฟังก์ชันเป้าหมาย: Maximize คะแนนรวม
    # =============================================================================
    prob += lpSum(
        x[(gid, h)] * (
            # ถ้าบ้าน h อยู่ในอันดับ 1-5 ของกลุ่ม gid
            PREF_SCORE_B[preference_index_cache[gid][h]] if h in preference_index_cache[gid]
            # ถ้าบ้าน h เป็น sub-preference ของกลุ่ม gid
            else SUB_PREF_SCORE_B
        )
        for (gid, h) in x
    ), "TotalPreferencePoints"
    
    # =============================================================================
    # Constraints (ข้อจำกัด)
    # =============================================================================
    
    # Constraint 1: แต่ละกลุ่มได้บ้านเดียวเท่านั้น
    for gid in group_size_map:
        group_vars = [x[(gid, h)] for (gid_check, h) in x if gid_check == gid]
        if group_vars:
            prob += lpSum(group_vars) == 1

    # Constraint 2: จำนวนคนในแต่ละบ้านไม่เกิน capacity
    for h in houses:
        house_vars = [x[(gid, h)] * group_size_map[gid] for (gid, h_check) in x if h_check == h]
        if house_vars:
            prob += lpSum(house_vars) <= houses[h]["capacity"]
            
    # Constraint 3: บ้านแต่ละหลังต้องมีคนอย่างน้อย MIN_RATIO ของ capacity
    for h in houses:
        house_vars = [x[(gid, h)] * group_size_map[gid] for (gid, h_check) in x if h_check == h]
        min_people = math.ceil((houses[h]["capacity"] * MIN_RATIO_B))
        if house_vars and houses[h]["capacity"] > 0:
            prob += lpSum(house_vars) >= min_people

    # =============================================================================
    # แก้ปัญหา
    # =============================================================================
    solver = PULP_CBC_CMD(msg=0, timeLimit=TIME_LIMIT_B)
    status = prob.solve(solver)

    # =============================================================================
    # สร้างผลลัพธ์
    # =============================================================================
    if status in [LpStatusOptimal, LpStatusNotSolved]:
        # ถ้าแก้ปัญหาสำเร็จ (หรือใกล้เคียง) ดึงผลลัพธ์
        for g in groups:
            gid = g["id"]
            assigned_house = None
            
            # รวบรวมบ้านที่กลุ่มนี้สามารถไปได้
            prefs = [g.get(f"house_rank_{i+1}") for i in range(5) if g.get(f"house_rank_{i+1}") is not None]
            subs = [g.get("house_rank_sub")] if g.get("house_rank_sub") is not None else []
            allowed_houses = set(prefs) | set(subs)
            
            # หาบ้านที่ได้รับ assignment
            for h in allowed_houses:
                if h in houses and (gid, h) in x:
                    if x[(gid, h)].varValue is not None and x[(gid, h)].varValue > 0.5:
                        result[gid] = h
                        assigned_house = h
                        break
            
            # ถ้าไม่ได้บ้านไหนเลย
            if assigned_house is None:
                result[gid] = None
        
        # จัดการกลุ่มที่ไม่มีการเลือกบ้าน
        for g in groups:
            if g not in groups_with_preferences:
                result[g["id"]] = None
                
    else:
        # ถ้าแก้ปัญหาไม่สำเร็จ ให้ผลลัพธ์เป็น None ทุกกลุ่ม
        for g in groups:
            result[g["id"]] = None

    return JSONResponse(result)