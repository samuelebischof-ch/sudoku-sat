#!/usr/bin/env python

# !!! Change this to fit your path !!!
minisat="./minisat/minisat"

import sys
from subprocess import Popen
from subprocess import PIPE
import re
import random
import os

gbi = 0
varToStr = ["invalid"]

def printClause(cl):
    print map(lambda x: "%s%s" % (x < 0 and eval("'-'") or eval ("''"), varToStr[abs(x)]) , cl)

def gvi(name):
    global gbi
    global varToStr
    gbi += 1
    varToStr.append(name)
    return gbi

# helper function to write clause
def cl(row,col,num):
    return 'inSquare({},{},{})'.format(row,col,num)

def gen_vars(rows, columns, values):

    varMap = {}

    # saves the 9 * 9 * 9 possible variables
    # every cella can have 9 possibility, there are 9 * 9 cells
    for row in range(0, rows):
        for col in range(0, columns):
            for val in range(1, values + 1):
                var_name=cl(row,col,val)
                varMap[var_name] = gvi(var_name)

    return varMap

def genSudokuConstr(rows, columns, values, vars, grid):

    clauses = []

    # Add fixed variable
    for row in range(0, 9):
        for col in range(0, 9):
            # for every field if there is already a number fix it
            val = grid[row][col]
            if val:
                clauses.append([vars[cl(row,col,val)]])

    # Iterate over every cell
    for row in range(0, 9):
        for col in range(0, 9):
            # Every cell has a number from 1 to 9
            clauses.append([vars[cl(row, col, d)] for d in range(1, 10)])
            # TODO: check
            for valA in range(1, 10):
                for valB in range(valA + 1, 10):
                    clauses.append([-vars[cl(row, col, valA)], -vars[cl(row, col, valB)]])

 
    # TODO: refactor
    def check(cells): 
        for i, xi in enumerate(cells):
            for j, xj in enumerate(cells):
                if i < j:
                    for val in range(1, 10):
                        clauses.append([-vars[cl(xi[0],xi[1],val)], -vars[cl(xj[0],xj[1],val)]])

    # Check that every row and column has no repetitions of the same number
    for i in range(0, 9):
        rows = []
        columns = []
        for j in range(0, 9):
            rows.append((i, j))
            columns.append((j, i))
        check(rows)
        check(columns)
        
    # Check that every 3 x 3 grid has no repetitions of the same number
    for i in 0, 3, 6:
        for j in 0, 3 ,6:
            cells = []
            for k in range(9):
                cells.append(((i + 1 + k % 3) - 1, (j + 1 + k // 3) - 1))
            check(cells)


    return clauses


# A helper function to print the cnf header
def printHeader(n):
    global gbi
    return "p cnf %d %d" % (gbi, n)

# A helper function to print a set of clauses cls
def printCnf(cls):
    return "\n".join(map(lambda x: "%s 0" % " ".join(map(str, x)), cls))

# This function is invoked when the python script is run directly and not imported
if __name__ == '__main__':
    if not (os.path.isfile(minisat) and os.access(minisat, os.X_OK)):
        print "Set the path to minisat correctly on line 4 of this file (%s)" % sys.argv[0]
        sys.exit(1)

    sudokuInFile = "/tmp/sat/sat/sudoku.in"
    sudokuOutFile = "/tmp/sat/sat/sudoku.out"
    rows = 9
    columns = 9
    values = 9

    # load sudoku from file to grid array
    grid = []
    sudoku = open(sudokuInFile, "r")
    counter = 0
    tempLine = []
    for line in sudoku:
        for word in line:
            if word.isdigit():
                tempLine.append(word)
                if (counter == 8):
                    counter = 0
                    grid.append(tempLine)
                    tempLine = []
                else:
                    counter += 1
            if word == 'n':
                tempLine.append(None)
                if (counter == 8):
                    counter = 0
                    grid.append(tempLine)
                    tempLine = []
                else:
                    counter += 1


    vars = gen_vars(rows, columns, values)

    rules = genSudokuConstr(rows, columns, values, vars, grid)

    head = printHeader(len(rules))
    rls = printCnf(rules)

    # here we create the cnf file for minisat
    fl = open("tmp_prob.cnf", "w")
    fl.write("\n".join([head, rls]))
    fl.close()

    # this is for runing minisat
    ms_out = Popen([minisat, "tmp_prob.cnf", "solution"], stdout=PIPE).communicate()[0]

    # Print the output, just out of curiosity
    print ms_out

    # minisat with these arguments writes the solution to a file called "solution".  Let's check it
    res = open("solution", "r").readlines()

    # if it was satisfiable, we want to have the assignment printed out
    if res[0] == "SAT\n":
        # First get the assignment, which is on the second line of the file, and split it on spaces
        asgn = map(int, res[1].split())
        # Then get the variables that are positive, and get their names.
        # This way we know that everything not printed is false.
        # The last element in asgn is the trailing zero and we can ignore it
        facts = map(lambda x: varToStr[abs(x)], filter(lambda x: x > 0, asgn[:-1]))

        # initialize array
        solution = []
        for i in range(0,9):
            line = []
            for j in range(0,9):
                line.append(None)
            solution.append(line)
        counter = 0

        # add values to array
        for f in facts:
            row = int(f[9])
            column = int(f[11])
            value = f[13]
            solution[row][column] = value

        # print solution to file TODO: change file name
        out = open(sudokuOutFile, "w")
        for i in range(0, len(solution)):
            print solution[i]
            for j in range(0, len(solution[i])):
                if (solution[i][j]):
                    out.write(str(solution[i][j]) + "\n")
                else:
                    out.write("n\n")


