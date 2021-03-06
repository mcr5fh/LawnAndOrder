"use strict";
const Coordinate = require("./Coordinate.js");
const Constants = require("./Constants.js");

class Robot {

    constructor(uid, navigationController) {
        this.uid = uid || -1;
        this.navigationController = navigationController;

        this.location = new Coordinate(-1, -1);
        this.startingLocation = new Coordinate(-1, -1);
        this.startingAlley = 0;
        this.currentAlley = -1;
        this.startedAtBottom = false;
        this.changingAlleys = false;
        this.endingAlley = -1;

        this.goalCoordinate = new Coordinate(-1, -1);
        this.jobComplete = false;

        this.pointsTraveled = [];

        this.redisClient = null;
    }

    /**
     * Initializing the robot for job
     * 
     * Sets the robot goal to bottom of starting alley. 
     * Sets changingAlleys to true as it gets to the alley
     * Sets jobComplete to false as its just beginning!
    **/
    start() {
        this.currentAlley = this.startingAlley;
        this.goalCoordinate = this.navigationController.alleys[this.startingAlley].start;
        this.changingAlleys = true;
        this.jobComplete = false;
        this.startedAtBottom = true;
    }

    /**
    * @param {Coordinate}   currentLocation the most recent point as returned  
    *                       by the open-cv server
    */
    updateLocation(currentLocation) {
        this.location = currentLocation;
        this.addPointTraveled(currentLocation);

        // check if robot is at Goal location and update
        if (this.DistanceToGoalCms < Constants.AllowedDistanceErrorCms) {

            // if was not changing alleys, it has reached end of alley and
            // must set next alley as goal
            if (!this.changingAlleys) {
                console.log("*** about to turn, updating location ***");
                const nextAlleyId = this.currentAlley + 1;

                if (nextAlleyId > this.endingAlley) {
                    console.log("*** JOB COMPLETE ***");
                    this.jobComplete = true;
                    this.start();
                    return false;
                }
                var nextAlley = this.navigationController.alleys[nextAlleyId];
                this.currentAlley = nextAlleyId;

                // if finished at the top (end) of an alley, must start at
                // the top (end) of the nextAlley
                if (this.startedAtBottom) {
                    this.goalCoordinate = nextAlley.end;
                    this.startedAtBottom = false;
                } else {
                    this.goalCoordinate = nextAlley.start;
                    this.startedAtBottom = true;
                }
                this.changingAlleys = true;
            }
            // else robot just reached the start of its alley, goal is the end
            else {
                console.log("*** start of alley, updating location ***");
                if (this.startedAtBottom) {
                    this.goalCoordinate = this.navigationController.alleys[this.currentAlley].end;
                } else {
                    this.goalCoordinate = this.navigationController.alleys[this.currentAlley].start;
                }
                this.changingAlleys = false;
            }

            console.log("Changed goalCoordinate to");
            console.log(this.goalCoordinate);
        }
        return true;
    }

    /**
    * @param {Coordinate}   coordinate the most recent point as returned  
    *                       by the open-cv server
    * @return {Boolean}     true if point added, false if not  
    */
    addPointTraveled(coordinate) {
        if (this.pointsTraveled.length == 0) {
            this.pointsTraveled.push(coordinate);
            return true;
        }

        const lastPoint = this.pointsTraveled[this.pointsTraveled.length - 1];
        const distancePixels = Coordinate.distance(lastPoint, coordinate);
        const distanceCms = distancePixels / Constants.PixelsPerCentimeter;

        if (distanceCms > Constants.RobotDimensions.height / 2) {
            this.pointsTraveled.push(coordinate);
            return true;
        }
        return false;
    }

    /**
    * @return {Number}     distance to goal in pixels  
    */
    get DistanceToGoalPixels() {
        return Coordinate.distance(this.location, this.goalCoordinate);
    };

    /**
    * @return {Number}     distance to goal in centimeters  
    */
    get DistanceToGoalCms() {
        return Coordinate.distance(this.location, this.goalCoordinate) / Constants.PixelsPerCentimeter;
    };

    get AngleToGoal() {
        var angleToGoal = Coordinate.angle(this.location, this.goalCoordinate);
        // if (angleToGoal < 0) angleToGoal += 360;
        return angleToGoal
    };
};

module.exports = Robot;
