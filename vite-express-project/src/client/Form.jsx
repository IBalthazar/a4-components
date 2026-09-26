function Form({form, isEditing, handleInputChange, onSubmit}){
    
    return(
        <form id="form" onSubmit={onSubmit}>
                <input 
                    type="text" 
                    id="assignment" 
                    name="assignment"
                    placeholder="Assignment" 
                    value={form.assignment} 
                    onChange={handleInputChange} 
                    required />
                <select 
                    id="category"
                    name="category"
                    value={form.category}
                    onChange={handleInputChange}
                    required
                    >
                    <option value="" disabled>Category</option>
                    <option id="Homework">Homework</option>
                    <option id="Essay">Essay</option>
                    <option id="Project">Project</option>
                    <option id="Quiz">Quiz</option>
                    <option id="Exam">Exam</option>
                    <option id="Other">Other</option>
                </select>
                <label htmlFor="deadline">Due date:</label>
                <input 
                    type="date" 
                    id="deadline" 
                    name="deadline"
                    value={form.deadline}
                    onChange={handleInputChange}
                    required />
                <button type="submit" className="submit button" id="submit" >Submit</button>
            </form>
    );
}

export default Form