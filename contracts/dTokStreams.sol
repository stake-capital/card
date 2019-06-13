pragma solidity ^0.5.0;

contract dTokStreams {
    
    string internal constant ERROR_NO_STREAM_URL_PROVIDED = "NO_STREAM_URL_PROVIDED";
    string internal constant ERROR_ONE_STREAM_PER_USER = "ONE_STREAM_PER_USER";

    struct Stream {
        string url;
        string title;
    }

    mapping(address => Stream) public streams; // One stream per address
    address[] public addrLookUpTable; // Used to iterate over all addresses corresponding to streams

    /*
    * @notice Create a record for a new dTok stream
    * @param _url The URL of the stream to be viewed via the Livepeer Media Player
    * @param _title The textual title / description of the stream
    */
    function createStream(string memory _url, string memory _title) public {

        require(bytes(_url).length > 0, ERROR_NO_STREAM_URL_PROVIDED);
        require(bytes(streams[msg.sender].url).length == 0, ERROR_ONE_STREAM_PER_USER); // A hacky way to check if the sender has already authored an existing stream (only one stream per user is currently allowed)

        // Save new Stream struct to mapping
        streams[msg.sender] = Stream(_url, _title);

        // Save the mapped address to the look up table (for accessing all streams)
        addrLookUpTable.push(msg.sender);
    }

    // A public getter for array size is required
    function size() view public returns (uint) {
        return addrLookUpTable.length;
    }
}
