import { PerpendicularDirections } from "./direction.js";
import { getUniqueIdentifier } from "./numerical_helpers.js";
import { GridSelector } from "./selector.js";
import { forEachInClass } from "./dom_helpers.js";
/**
 * Sets up a renderer for a grid,
 * capable of creating or modifying html elements on the fly to reflect changes in the data.
 */
export class GridRenderer {
    constructor(target = document.body, tileset) {
        this.styles = {
            grid: {
                BGColor: 'black',
                borderDefault: '1px dotted white'
            },
            selection: {
                BGColor: 'inherit',
                borderEdge: '2px solid white'
            }
        };
        this.identifier = getUniqueIdentifier().toString();
        this.tileset = tileset ? tileset : undefined;
        this.createFrame(target);
    }
    /**
     * Adds a frame div into the target element in which to mount the grid rows.
    */
    createFrame(targetElement) {
        if (document.getElementById("Grid_Renderer_Frame" + this.identifier) == null) {
            let div = document.createElement("div");
            targetElement.appendChild(div).id = "Grid_Renderer_Frame_" + this.identifier;
            this.frame = document.getElementById('Grid_Renderer_Frame_' + this.identifier);
            this.frame.classList.add('grid-renderer-frame');
        }
    }
    /**
     * Builds a DOM grid from the Grid with full selection functionality.
    */
    dynamicRender(grid, gridSelector) {
        this.resolveData_DocumentDeltas(grid);
        this.renderSelection(gridSelector);
    }
    /**
     * Clears all cells from DOM, then recreates them, thereby removing any linked event listeners.
     * NOTE: will run into errors here with the loading of selections, and event listeners on the rows instead of tiles.
    */
    redoRender(grid) {
        this.clearDOMRows();
        this.resolveData_DocumentDeltas(grid);
        this.renderTileset(grid);
    }
    clearDOMRows() {
        forEachInClass('grid-row', (element) => {
            element.innerHTML = '';
        });
    }
    clearDOMRenderFrame() {
        this.frame.innerHTML = '';
    }
    removeDOMRenderFrame() {
        this.frame.remove();
    }
    /**
     * Ensures only cells contained in the selector are rendered as selected.
     * Similar to {@link resolveData_DocumentDeltas}.
    */
    resolveSelection_DocumentDeltas(selector) {
        let selectedCells = document.getElementsByClassName("selected");
        let toRemove = [];
        for (let i = 0; i < selectedCells.length; i++) {
            let [x, y] = getCoordsFromCellReference(selectedCells[i]);
            if (!selector.selection.hasCell([x, y])) {
                toRemove.push(selectedCells[i]);
            }
        }
        this.fulfillSelectionRemovalQueue(toRemove);
    }
    /**
     * Deselects all cells in queue.
     * @see {@link derenderCellSelection}
    */
    fulfillSelectionRemovalQueue(removalQueue) {
        for (let i = 0; i < removalQueue.length; i++) {
            this.derenderCellSelection(removalQueue[i]);
        }
    }
    /**
     * Renders selector onto DOM grid.
     * @see {@link renderCellSelection}
    */
    renderSelection(selector) {
        let grid = selector.childGrid;
        this.resolveSelection_DocumentDeltas(selector);
        selector._iterateOverSelection((opts) => {
            let [cellX, cellY] = opts.initialPosition;
            let HTMLCellReference = getCellReference([cellX, cellY], this.identifier);
            this.renderCellSelection(HTMLCellReference);
        });
    }
    /**
     * Iterates over whole grid to deselect every cell.
     */
    removeSelection(selector) {
        let renderer = this;
        selector.selection.forEachCell((cell, grid, renderer) => {
            let HTMLCellReference = getCellReference(cell.XYCoordinate, this.identifier);
            renderer.derenderCellSelection(HTMLCellReference);
        });
    }
    /**
     * Renders selection on cell by giving it a style class.
    */
    renderCellSelection(cell) {
        cell.classList.add('selected');
    }
    /**
     * Derenders selection on cell by removing its style class.
    */
    derenderCellSelection(cell) {
        cell.classList.remove('selected');
    }
    /**
     * @TODO
     * For multiple selections, for every cell, hides border of cell if and only if the adjacent cell in that direction is also selected.
    */
    renderAdjacentCellBorders(grid, selector, currentCell, HTMLCellReference) {
        let adjacencies = currentCell.adjacentCells;
        for (let i = 0; i < PerpendicularDirections.length; i++) {
            let direction = PerpendicularDirections[i];
            let adjacentCell = adjacencies[direction];
            let border = HTMLCellReference.style;
            if (adjacentCell != undefined) {
                if (selector.selection.hasCell(adjacentCell.XYCoordinate) == false) {
                    border['border-' + direction] = this.styles.selection.borderEdge;
                }
                else {
                    border['border-' + direction] = this.styles.grid.borderDefault;
                }
            }
            else {
                border['border-' + direction] = this.styles.selection.borderEdge;
            }
        }
    }
    /**
     * @TODO
     * Places a custom border style on all sides of a cell individually.
    */
    removeCellBorders([cellX, cellY], HTMLCellReference) {
        for (let i = 0; i < PerpendicularDirections.length; i++) {
            let direction = PerpendicularDirections[i];
            HTMLCellReference.style['border-' + direction] = this.styles.grid.borderDefault;
        }
    }
    /**
     * Iterates across whole grid to place tiles images.
    */
    renderTileset(grid) {
        grid.forEachCell((cell, grid) => {
            this.renderTile(cell);
        });
    }
    /**
     * Sets tile image specified on cell in data as the background image for the cell in the DOM.
    */
    renderTile(cell) {
        var _a;
        let tilename = cell.data.tile;
        if (tilename != undefined) {
            let HTMLCellReference = getCellReference(cell.XYCoordinate, this.identifier);
            if (this.tileset) {
                let imgPath = (_a = this.tileset.get(tilename)) === null || _a === void 0 ? void 0 : _a.path;
                HTMLCellReference.style.backgroundImage = `url(\"${imgPath}\")`;
            }
        }
    }
    /**
     * Ensures that the DOM grid matches the Grid in data.
     * @see {@link checkRowsInDocument}
     * @see {@link checkCellsInDocument}
     * @see {@link checkRowsInGrid}
    */
    resolveData_DocumentDeltas(grid) {
        this.checkRowsInDocument(grid);
        this.checkCellsInDocument(grid);
        this.checkRowsInGrid(grid);
    }
    /**
     * Checks each row in data exists in the DOM.
     * If it does, checks over cells in that row.
     * If it doesn't, adds that row to DOM.
     * @see {@link documentHasRow}
     * @see {@link checkCellsInRowInGrid}
     * @see {@link addRowToDocument}
    */
    checkRowsInGrid(grid) {
        grid.rows.forEach((row, YPosition) => {
            if (documentHasRow(YPosition, this.identifier)) {
                this.checkCellsInRowInGrid(row, YPosition);
            }
            else {
                this.addRowToDocument(row, YPosition);
            }
        });
    }
    /**
     * Checks each cell in row data exists in DOM.
     * If it doesn't, adds a cell with that [x,y].
     * @see {@link documentHasCell}
     * @see {@link addCellToDocument}
    */
    checkCellsInRowInGrid(row, YPosition) {
        row.columns.forEach((column, XPosition, grid) => {
            if (!documentHasCell([XPosition, YPosition], this.identifier)) {
                this.addCellToDocument([XPosition, YPosition]);
            }
        });
    }
    /**
     * Checks over rows in DOM, and removes them if a Row at that YPosition doesn't exist in data.
     * @see {@link fulfillRowRemovalQueue}
    */
    checkRowsInDocument(grid) {
        let rows = document.getElementsByClassName('grid-row-in-' + this.identifier);
        let removalQueue = [];
        for (let i = 0; i < rows.length; i++) {
            let row = rows.item(i);
            let id = row.id;
            let index = parseInt(id.split(' ')[1]);
            if (grid.hasRow(index) == false) {
                removalQueue.push(row);
            }
        }
        this.fulfillRowRemovalQueue(removalQueue);
    }
    /**
     * Checks over cells in DOM, and removes them is a Cell at that [x,y] doesn't exist in data.
     * @see {@link fulfillCellRemovalQueue}
    */
    checkCellsInDocument(grid) {
        let cells = document.getElementsByClassName('grid-cell-in-' + this.identifier);
        let removalQueue = [];
        for (let i = 0; i < cells.length; i++) {
            let cell = cells.item(i);
            let id = cell.id;
            let [itemName, XString, YString] = id.split(' ');
            let [XPosition, YPosition] = [parseInt(XString), parseInt(YString)];
            if (grid.hasCell([XPosition, YPosition]) == false) {
                removalQueue.push([cell, YPosition]);
            }
        }
        this.fulfillCellRemovalQueue(removalQueue);
    }
    /**
     * Adds a row to the DOM at the specified YPosition, and fills it with cells.
     * @see {@link addCellToDocument}
    */
    addRowToDocument(row, YPosition) {
        let HTMLRow = document.createElement("div");
        this.frame.appendChild(HTMLRow).id = `row ${YPosition}` + ' ' + this.identifier;
        let HTMLRowReference = getRowReference(YPosition, this.identifier);
        HTMLRowReference.classList.add('grid-row');
        HTMLRowReference.classList.add('grid-row-in-' + this.identifier);
        HTMLRowReference.style.order = `${YPosition}`;
        row.columns.forEach((column, XPosition, row) => {
            if (!documentHasCell([XPosition, YPosition], this.identifier)) {
                this.addCellToDocument([XPosition, YPosition]);
            }
        });
    }
    /**
     * Adds a cell to the DOM at the XYCoordinate specified.
    */
    addCellToDocument([XPosition, YPosition]) {
        let div = document.createElement("div");
        let HTMLRowReference = getRowReference(YPosition, this.identifier);
        HTMLRowReference.appendChild(div).id = `cell ${XPosition} ${YPosition}` + ' ' + this.identifier;
        let HTMLCellReference = getCellReference([XPosition, YPosition], this.identifier);
        HTMLCellReference.classList.add('grid-cell');
        HTMLCellReference.classList.add('grid-cell-in-' + this.identifier);
        HTMLCellReference.style.order = `${XPosition}`;
    }
    /**
     * Iterates through a removalQueue and removes each row from the DOM.
     * @see {@link removeRowFromDocument}
    */
    fulfillRowRemovalQueue(removalQueue) {
        for (let i = 0; i < removalQueue.length; i++) {
            let row = removalQueue[i];
            this.removeRowFromDocument(row);
        }
    }
    /**
     * Iterates through a removalQueue and removes each cell from the DOM.
     * @see {@link removeCellFromDocument}
    */
    fulfillCellRemovalQueue(removalQueue) {
        for (let i = 0; i < removalQueue.length; i++) {
            let cell = removalQueue[i][0];
            let YPosition = removalQueue[i][1];
            this.removeCellFromDocument(cell, YPosition);
        }
    }
    /**
     * Removes a row from the DOM.
    */
    removeRowFromDocument(row) {
        this.frame.removeChild(row);
    }
    /**
     * Removes a cell from the DOM.
    */
    removeCellFromDocument(cell, YPosition) {
        let row = getRowReference(YPosition, this.identifier);
        row.removeChild(cell);
    }
}
/**
 * Generates the id for and gets a row from the DOM.
*/
function getRowReference(y, identifier) {
    return document.getElementById(`row ${y}` + ' ' + identifier);
}
/**
 * Generates the id for and gets a cell from the DOM.
*/
export function getCellReference([x, y], identifier) {
    return document.getElementById(`cell ${x} ${y}` + ' ' + identifier);
}
/**
 * Checks whether a cell exists in the DOM with the specified XYCoordinate.
*/
function documentHasCell([x, y], identifier) {
    return getCellReference([x, y], identifier) != null;
}
/**
 * Checks whether a row exists in the DOM with the specified YCoordinate.
*/
function documentHasRow(y, identifier) {
    return getRowReference(y, identifier) != null;
}
/**
 * Generate the coordinate pair for a cell.
*/
function getCoordsFromCellReference(cellReference) {
    let id = cellReference.id;
    let [cell, xCoord, yCoord, identifier] = id.split(" ");
    let x = parseInt(xCoord);
    let y = parseInt(yCoord);
    return [x, y];
}
function testShiftSelection([deltaX, deltaY], testGrid) {
    let s = new GridSelector(testGrid);
    let r = new GridRenderer();
    s.shift([deltaX, deltaY]);
    r.removeSelection(testGrid);
    testGrid.boundRenderer.renderSelection();
}