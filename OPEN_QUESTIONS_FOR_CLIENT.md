# Open questions for the client

These points came up while turning the four documents into app content. Each one is marked **[[VERIFY: …]]** inside the lesson, so it cannot be missed. Please confirm or correct each one; the lesson text and quizzes will then be updated to match.

Items 1 to 3 are the most important, because they affect whether the build instructions actually work.


**1. Project: Automatic Fire Extinguisher Robotic Car**

The client notes connect the motor driver to pins D8, D9, D10 and D11 (Lesson 3) and also connect the ultrasonic sensor TRIG to D11 and ECHO to D10 (Lesson 4). The same pins cannot do both jobs. Check the working car and correct the pin numbers in the lessons, the pin table and the quizzes.

*Where:* Module 3 › Wire the drive system; Module 4 › Wire the ultrasonic sensor; Module 7 › Wire the motors and the sensors; Module 7 › Wire the pump and add the main switch


**2. Robotics Foundations (SmartBrains Arduino)**

The Lesson 2 quiz in the client notes says the anode is connected to 3.3V, but these steps connect it through a resistor to a digital pin. Confirm which wiring is correct and make the steps and quiz match.

*Where:* Module 2 › Wire the simple circuit


**3. Robotics Foundations (SmartBrains Arduino)**

This lesson connects the LEDs straight between 3.3V and GND with no resistor, while Lesson 2 uses resistors. Please test on the real kit and confirm whether a resistor is needed.

*Where:* Module 3 › Place and connect the LEDs


**4. Robotics Foundations (SmartBrains Arduino)**

Add the school's Tinkercad login link and login steps. The client notes do not include them.

*Where:* Module 2 › Open the SmartBrains Tinkercad dashboard


**5. Robotics Foundations (SmartBrains Arduino)**

The notes say "Connect 3 pins to the port to all the GNDs". Confirm how many GND pins are used and add a picture.

*Where:* Module 4 › Wire the LEDs


**6. Robotics Foundations (SmartBrains Arduino)**

The notes only say "picture of the codes to be inserted". This Arduino sketch was drafted to match pins 8, 9 and 10. Check it against the client's mBlock version and upload a picture of the blocks.

*Where:* Module 4 › Code the traffic light


**7. Coding Foundations (Scratch, HTML and CSS)**

The client notes only say "Explain parts of a computer and their functions". This table was drafted. Replace it with the client's own list if they have one.

*Where:* Module 1 › Parts of a computer


**8. Project: Automatic Fire Extinguisher Robotic Car**

The notes only list this as a lesson objective. This lesson was drafted. Check the pin counts against the board the school uses.

*Where:* Module 1 › Meet the Arduino Uno


**9. Project: Automatic Fire Extinguisher Robotic Car**

The notes describe both a motor driver that plugs onto the Arduino and one wired with IN1 to IN4 jumper wires. Confirm which part the kit uses.

*Where:* Module 3 › Wire the drive system


**10. Project: Automatic Fire Extinguisher Robotic Car**

Lesson 9 refers to the relay's COM and NO terminals, but only COM is mentioned here. Confirm the full pump wiring (which relay terminal the pump connects to) and add it.

*Where:* Module 5 › Wire the pump through the relay


**11. Project: Automatic Fire Extinguisher Robotic Car**

The notes say "drag and arrange the following blocks (picture to be added)". This plan was drafted from the lesson objective. Replace it with the client's actual block order and picture.

*Where:* Module 8 › Plan the program


**12. Project: Automatic Hand Sanitizer Dispenser**

The notes say "add an extension for the ultrasonic sensor PCM". Confirm the exact extension name.

*Where:* Module 7 › Set up mBlock


**13. Project: Automatic Hand Sanitizer Dispenser**

The notes say "drag the code blocks as instructed by the illustration (image to be inserted)". This plan was drafted. Replace it with the client's actual blocks, including the distance value and servo angles.

*Where:* Module 7 › Plan the program


## Pictures still needed

- Robotics Foundations (SmartBrains Arduino): 10 placeholders (search the lessons for "Picture to be added")
- Coding Foundations (Scratch, HTML and CSS): 0 placeholders (search the lessons for "Picture to be added")
- Project: Automatic Fire Extinguisher Robotic Car: 7 placeholders (search the lessons for "Picture to be added")
- Project: Automatic Hand Sanitizer Dispenser: 5 placeholders (search the lessons for "Picture to be added")

## Content that is not in the client documents (drafted, please review)

- Robotics Foundations: the traffic-light Arduino sketch; short explanations of resistors and robot types that the Lesson 1 quiz asked about but the lesson never taught; quizzes for Lessons 3 and 4 and a final check.
- Coding Foundations: all quizzes (the notes had none); the "Parts of a computer" lesson; the hands-on tasks and starter code for every HTML and CSS lesson (corrected: straight quotes, radio buttons for gender, `border: 2px solid blue`).
- Both projects: quizzes for the lessons that had none, the final check for each project, and the program plans for mBlock (the notes only said the block picture would be added).
- Both projects: safety cautions for flame, water and hot glue.
- Quiz answers for the Hand Sanitizer project: the notes had no answer key, so answers were written from the lesson content. Please check them.