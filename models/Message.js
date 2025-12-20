const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const MessageSchema = new Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    room: {
      type: Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", MessageSchema);
