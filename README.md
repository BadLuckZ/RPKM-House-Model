# RPKM2025 - Group Assignment

## Setup
1. Open your folder you want then clone this project
```sh
git clone https://github.com/BadLuckZ/Study-ILP-Model.git
```

2. Go inside this project, Open new terminal and install packages
```sh
npm install
```

You might need to install this too for the backend part
```sh
pip install fastapi
pip install uvicorn
pip install pulp
```

3. In that same terminal, since my ```main.py``` is in ```ilp-api``` so I have to run this
```sh
cd ilp-api
uvicorn main:app --reload
```
This is for the backend part

4. Open a new terminal, then you can run...
```sh
npm run dev
```
This is for the frontend part

After this step, you should be able to ```localhost:4321``` and see the Group Assignment UI like this
<img width="400" height="250" alt="image" src="https://github.com/user-attachments/assets/b0e0993c-d276-4091-8a4d-35c6741c6164" />

## Workflow
Code นี้มี Page เดียว โดย...
- หาก FIXED_GROUPS = []  จะมี Input เพื่อรับจำนวนกลุ่มที่ต้องการจะให้สร้าง Group ขึ้นมา
- หาก FIXED_GROUPS != [] ก็จะไม่มี Input ดังกล่าว

หลังจากมี Groups แล้ว เพียงแค่กดปุ่ม ```Assign Groups Va``` และ ```Assign Groups Vb``` และรอผลลัพธ์ประมาณ 1 นาทีก็จะได้ผลลัพธ์การจัดกลุ่มออกมา โดยสามารถเก็บผลลัพธ์เหล่านี้ได้ด้วยการกดปุ่ม ```Export All Tables``` แล้วนำไปใช้งานต่อได้เลย

***Note*** : Va และ Vb คือ Linear Programming (Lp) ที่เน้นการเก็บคะแนนให้ได้มากที่สุดเท่าที่จะทำได้ ภายใต้ Constraint ที่กำหนด โดย Va และ Vb แตกต่างกันที่จำนวนคะแนนที่ได้ และลำดับการให้ความสำคัญ

## Adjustable Things
1. [const.ts](src/utils/const.ts)
   - ```FIXED_HOUSES```: ไว้สำหรับเก็บข้อมูลต่างๆ ของบ้าน
   - ```FIXED_GROUPS```: ไว้สำหรับเก็บข้อมูลต่างๆ ของ Group (ในการทดสอบ Program จะ set ให้ FIXED_GROUPS = [] แต่ในการทำงานจริงๆ จะให้ FIXED_GROUPS เป็นผลลัพธ์ที่ได้จากการ Query ด้วย [group_join_user.sql](src/utils/group_join_user.sql))

2. [main.py](ilp-api/main.py)
   - ```Va```: Lp Model ที่เน้นการให้อันดับ 1 ให้ได้มากที่สุด หากให้ไม่ได้แล้วจึงค่อยๆ ไล่เรียงมายังอันดับถัดๆ ไป
   - ```Vb```: Lp Model ที่ไม่ได้ให้ความสำคัญกับอะไรเป็นพิเศษนอกเหนือจาก Constraint ที่กำหนด

ทั้งสอง Model จะมีค่าที่ปรับได้อยู่ 4 ค่า
   - ```PREF_SCORE```: เป็นคะแนนที่ Model จะได้ หาก Assign ให้ Group นั้นได้บ้านที่เลือกในอันดับ 1, 2, 3, 4, 5 ตามลำดับ เช่น PREF_SCORE = [5, 4, 3, 2, 1] หาก Model Assign ให้ Group ได้บ้านในลำดับที่ 1, Model นั้นก็จะได้ 5 คะแนน เป็นต้น
   - ```SUB_PREF_SCORE```: เป็นคะแนนที่ Model จะได้ หาก Assign ให้ Group นั้นได้บ้านที่เลือกในอันดับสำรอง
   - ```TIME_LIMIT```: เป็นเวลาสูงสุดในการให้ Model แก้ปัญหา (วินาที)
   - ```MIN_RATIO```: เป็นอัตราส่วนขั้นต่ำที่ทุกบ้านต้องมีคน
